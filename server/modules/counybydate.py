from .moduleimpl import ModuleImpl
import pandas as pd
import numpy as np
from datetime import datetime
from dateutil.parser import parse

# ---- CountByDate ----
# group column by unique value, discard all other columns

ALT_DEFAULT_DATETIME = datetime(9999, 7, 1, 3, 17)

def _guess_time_or_date(date):
    DATE_ONLY = False
    TIME_ONLY = False
    today = datetime.now()

    first_pass = parse(date)

    if (first_pass.hour, first_pass.minute) == (0, 0):
        # This might only have a date
        second_pass = parse(date, default=ALT_DEFAULT_DATETIME)
        if (second_pass.hour, second_pass.minute) == (ALT_DEFAULT_DATETIME.hour, ALT_DEFAULT_DATETIME.minute):
            # This is definitely a date without a time
            DATE_ONLY = True

    if (first_pass.year, first_pass.month, first_pass.day) == (today.year, today.month, today.day):
        # This might only have a time
        second_pass = parse(date, default=ALT_DEFAULT_DATETIME)
        if (second_pass.year, second_pass.month, second_pass.day) == (ALT_DEFAULT_DATETIME.year, ALT_DEFAULT_DATETIME.month, ALT_DEFAULT_DATETIME.day):
            # This is definitely a time without a date
            TIME_ONLY = True

    return (DATE_ONLY, TIME_ONLY)


class CountByDate(ModuleImpl):
    # Menu items, must match order in json
    SORT_BY_VALUE = 0
    SORT_BY_FREQ = 1

    TIME_ONLY_COUNT = 0
    DATE_ONLY_COUNT = 0
    TIME_ONLY = False
    DATE_ONLY = False

    @staticmethod
    def render(wf_module, table):
        # reset these on every render

        CountByDate.TIME_ONLY_COUNT = 0
        CountByDate.DATE_ONLY_COUNT = 0
        CountByDate.TIME_ONLY = False
        CountByDate.DATE_ONLY = False

        return_table = pd.DataFrame()
        col = wf_module.get_param_column('column')
        target = wf_module.get_param_column('targetcolumn')
        groupby = wf_module.get_param_menu_idx('groupby')
        operation = wf_module.get_param_menu_idx('operation')
        group_options = [
            "%Y-%m-%d %H:%M:%S",  # Seconds
            "%Y-%m-%d %H:%M",  # Minutes
            "%Y-%m-%d %H:00",  # Hours
            "%Y-%m-%d",  # Days
            "%Y-%m",  # Months
            lambda d: "%d Q%d" % (d.year, d.quarter),  # Quarters
            "%Y",  # Years
        ]
        time_only_options = [
            "%H:%M:%S",  # Seconds
            "%H:%M",  # Minutes
            "%H:00"  # Hours
        ]

        if col == '':
            wf_module.set_error('Please select a column containing dates')
            return table

        if table is None:
            return None

        if col not in table.columns:
            return('There is no column named \'%s\'' % col)

        # convert the date column to actual datetimes
        try:
            def inner_func(val):
                str_val = str(val)
                if str_val == '':
                    return 'no date'
                date_only, time_only = _guess_time_or_date(str_val)
                if date_only:
                    CountByDate.DATE_ONLY_COUNT += 1
                if time_only:
                    CountByDate.TIME_ONLY_COUNT += 1
                return pd.to_datetime(str_val)

            return_table[col] = table[col].apply(inner_func)

            if CountByDate.DATE_ONLY_COUNT / len(return_table[col]) > .8:
                CountByDate.DATE_ONLY = True

            if CountByDate.TIME_ONLY_COUNT / len(return_table[col]) > .8:
                CountByDate.TIME_ONLY = True

        except (ValueError, TypeError):
            return('The column \'%s\' does not appear to be dates or time.' % col)

        # Figure out our groupby options and groupby
        # behavior based on the input format.

        if return_table[col].dtype == 'int64':
            return('Column %s does not seem to be dates' % col)

        if CountByDate.TIME_ONLY == True:
            try:
                return_table[col] = return_table[col].apply(lambda x: x.strftime(time_only_options[groupby]) if x != 'no date' else x)
            except IndexError:
                return 'The column \'%s\' only contains time values. Please group by Hour, Minute or Second.' % col

        elif CountByDate.DATE_ONLY == True and groupby in [0,1,2]:
            return 'The column \'%s\' only contains date values. Please group by Day, Month, Quarter or Year.' % col

        elif groupby == 5:  # quarter
            return_table[col] = return_table[col].apply(lambda x: group_options[groupby](x) if x != 'no date' else x)

        else:
            return_table[col] = return_table[col].apply(lambda x: x.strftime(group_options[groupby]) if x != 'no date' else x)

        # We now have correctly formatted dates for our groupby operation in our new table.
        # If we're just counting rows, we don't need any more columns.
        if operation == 0:  # count
            return_table = pd.DataFrame(return_table.groupby(return_table[col]).size())
            result_column_name = 'count'

        # If there's a target column:
        elif target != '':
            return_table[target] = table[target]
            result_column_name = target
            # If the target column isn't numeric, attempt to convert it:
            if return_table[target].dtype != np.float64 and return_table[target].dtype != np.int64:
                try:
                    return_table[target] = table[target].str.replace(',', '')
                    return_table[target] = return_table[target].astype(float)
                except ValueError:
                    return 'Can\'t convert %s to numeric values' % target
        # If we're trying to do something besides count and there's no target column, we're
        # still waiting on user input.
        else:
            return table

        if operation == 1:  # average
            return_table = pd.DataFrame(return_table.groupby(return_table[col]).mean())

        if operation == 2:  # sum
            return_table = pd.DataFrame(return_table.groupby(return_table[col]).sum())

        if operation == 3:  # min
            return_table = pd.DataFrame(return_table.groupby(return_table[col]).min())

        if operation == 4:  # max
            return_table = pd.DataFrame(return_table.groupby(return_table[col]).max())

        return_table.reset_index(level=0, inplace=True)  # turn index into a column, or we can't see the column names
        return_table.columns = [col, result_column_name]

        return_table = return_table.sort_values(col)

        return return_table
