import capybara
from capybara.session import Session
from contextlib import contextmanager
import os


# DISABLE capybara's default wait time! We're more explicit about timeouts in
# our tests, so our behavior is more predictable. (We try to avoid tests that
# fail intermittently.)
capybara.default_max_wait_time = 0


#@capybara.register_driver('selenium')
#def init_selenium_driver(app):
#    from capybara.selenium.driver import Driver
#    return Driver(app, browser="chrome")
@capybara.register_driver('selenium')
def init_selenium_driver(app):
    from capybara.selenium.driver import Driver
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
    capabilities = DesiredCapabilities.FIREFOX.copy()
    capabilities['moz:firefoxOptions'] = {
        'log': { 'level': 'trace' },
        'args': [],
    }
    return Driver(app, browser="firefox", desired_capabilities=capabilities)


def _sanitize_base_url(url: str) -> str:
    # self.base_url: always a string, never ending with '/'
    if url and url[-1] == '/': uyrl = url[0:-2]
    return url


class Browser:
    """A real web browser window that does what you want.

    This browser is modeled after Capybara:
    https://www.rubydoc.info/github/teamcapybara/capybara/master#The_DSL

    This DSL encourages single-call methods, to avoid races. It _discourages_
    code like `browser.find('input[name="foo"]').click()`, because that has a
    race: what happens if the input disappears after `find()` and before
    `click()`? An exception -- which is not ideal.

    The DSL also encourages you to consider races with every line of code.
    `wait_for_element()` will stall until an element appears. And
    `not browser.exists(..., wait: true)` is different from
    `browser.not_exists(..., wait: true)`, since the latter will wait for the
    element to disappear.

    Keyword arguments:
    base_url -- automatic prefix to 'visit()' urls (default '')
    default_wait_timeout -- default timeout for 'wait_for_element()' etc, in s
                            (default 5)
    """
    def __init__(self, **kwargs):
        self.page = Session("selenium", None)
        self.base_url = _sanitize_base_url(kwargs.get('base_url') or '')

        # default wait timeout -- None means forever
        self.default_wait_timeout = kwargs.get('default_wait_timeout', 5)


    def _capybarize_kwargs(self, kwargs):
        """In-place modifies kwargs.

        Conversions:
        - Converts 'wait':True to 'wait':default_wait_timeout.
        """
        if kwargs.get('wait') is True:
            kwargs['wait'] = self.default_wait_timeout


    def visit(self, url: str) -> None:
        """Types 'url' into the address bar, presses Enter, and awaits onload.
        """
        if url[0] == '/': url = self.base_url + url
        self.page.visit(url)


    def fill_in(self, locator: str, text: str, **kwargs) -> None:
        """Types 'text' into field with name/label/id 'locator'.

        Raises ValueError if text is empty. (Empty text is usually an error in
        test code.)

        Keyword arguments:
        wait -- True or number of seconds to wait until element appears
        """
        if not text: raise ValueError("fill_in() called without text")
        kwargs['value'] = text
        self._capybarize_kwargs(kwargs)
        self.page.fill_in(locator, **kwargs)


    def check(self, locator: str, **kwargs) -> None:
        """Check the checkbox with name/label/id 'locator'.

        Keyword arguments:
        wait -- True or number of seconds to wait until element appears
        """
        self._capybarize_kwargs(kwargs)
        self.page.check(locator, **kwargs)


    def uncheck(self, locator: str, **kwargs) -> None:
        """Unheck the checkbox with name/label/id 'locator'.

        Keyword arguments:
        wait -- True or number of seconds to wait until element appears
        """
        self._capybarize_kwargs(kwargs)
        self.page.uncheck(locator, **kwargs)


    def select(self, locator: str, text: str, **kwargs) -> None:
        """Selects 'text' in the select box with name/label/id 'locator'.

        Keyword arguments:
        wait -- True or number of seconds to wait until element appears
        """
        self._capybarize_kwargs(kwargs)
        kwargs['field'] = locator
        self.page.select(text, **kwargs)


    def click_button(self, locator: str, **kwargs) -> None:
        """Clicks the button with name/id/text 'locator'.

        Keyword arguments:
        wait -- True or number of seconds to wait until element appears
        """
        self._capybarize_kwargs(kwargs)
        self.page.click_button(locator, **kwargs)


    def click_link(self, locator: str, **kwargs) -> None:
        """Clicks the <a> with id/text/title 'locator'.

        Keyword arguments:
        wait -- True or number of seconds to wait until element appears
        """
        self._capybarize_kwargs(kwargs)
        self.page.click_link(locator, **kwargs)


    def click_whatever(self, *selector, **kwargs) -> None:
        """Clicks the selected element.

        Raises unless 1 element matches the selector.

        Calling this method usually means the site has an accessibility
        problem. Prefer click_link() and click_button(): the user should be
        clicking on links and buttons to make things happen.
        
        See 'assert_element()' for syntax.

        Keyword arguments:
        wait -- seconds to poll (default 0)
        text -- text the element must contain
        """
        self._capybarize_kwargs(kwargs)
        # There's a race here between find() and click(). If we get an error
        # about "missing element", write the exception handler we need.
        self.page.find(*selector, **kwargs).click()


    def hover_over_element(self, *selector, **kwargs) -> None:
        """Clicks the selected element.

        Raises unless 1 element matches the selector.

        Calling this method usually means the site has an accessibility
        problem. Not all users can hover.
        
        See 'assert_element()' for syntax.

        Keyword arguments:
        wait -- seconds to poll (default 0)
        text -- text the element must contain
        """
        self._capybarize_kwargs(kwargs)
        # There's a race here between find() and click(). If we get an error
        # about "missing element", write the exception handler we need.
        self.page.find(*selector, **kwargs).click()


    def assert_element(self, *selector, **kwargs) -> None:
        """Tests that 'selector' matches, or throws an error.

        Example selectors:
        - 'div.foo'
        - '#main'
        - 'xpath', '//h1[contains(text(), "foo")]' (two arguments, more
          complex than simply using the 'text' kwarg.)

        Keyword arguments:
        wait -- seconds to poll (default 0)
        text -- text the element must contain
        """
        self._capybarize_kwargs(kwargs)
        self.page.assert_selector(*selector, **kwargs)


    def assert_no_element(self, *selector, **kwargs) -> None:
        """Tests that 'selector' does _not_ match, or throws an error.

        Example selectors:
        - 'div.foo'
        - '#main'
        - 'xpath', '//h1[contains(text(), "foo")]' (two arguments, more
          complex than simply using the 'text' kwarg.)

        Keyword arguments:
        wait -- seconds to poll until the element goes away (default 0)
        text -- text the element we don't want to find must contain
        """
        self._capybarize_kwargs(kwargs)
        self.page.assert_no_selector(*selector, **kwargs)


    def wait_for_element(self, *selector, **kwargs) -> None:
        """Polls until 'selector' matches; throws error on timeout.

        Keyword arguments:
        wait -- seconds to poll (default default_wait_timeout)
        text -- text the element must contain
        """
        if 'wait' not in kwargs:
            kwargs['wait'] = self.default_wait_timeout
        self.assert_element(*selector, **kwargs)


    @contextmanager
    def scope(self, selector: str) -> None:
        """Within the given block, scopes all selectors within 'selector'.

        Example:

            with browser.scope('#root'):
                browser.assert_element('h2')
        """
        with self.page.scope(selector):
            yield


    def quit(self) -> None:
        """Destroys the browser and everything it created.
        """
        self.page.driver.browser.quit() # hack Capybara's internals
