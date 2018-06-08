from .moduleimpl import ModuleImpl
from django.conf import settings
import requests_oauthlib
from server.sanitizedataframe import sanitize_dataframe
import io
import json
import pandas as pd
from pandas.io.common import CParserError
from server.versions import save_fetched_table_if_changed
from typing import Any, Tuple, Optional



def get_spreadsheet(
        sheet_id: str,
        maybe_token: Optional[Any]) -> Tuple[Optional[str], Optional[str]]:
    """HTTP-request, bailing on error or if maybe_token is invalid.

    Return (DataFrame, None) if everything worked.

    Return (None, 'message') if something went wrong.
    """
    if not maybe_token or not maybe_token.get('refresh_token'):
        return (None, 'Not authorized. Please reconnect to Google Drive.')

    try:
        service = settings.PARAMETER_OAUTH_SERVICES['google_credentials']
    except KeyError:
        return (None, 'google_credentials not configured. Please restart Workbench with a Google secret.')

    client = requests_oauthlib.OAuth2Session(client_id=service['client_id'], token=maybe_token)
    temporary_token = client.refresh_token(
        service['token_url'],
        client_id=service['client_id'],
        client_secret=service['client_secret']
    ) # TODO handle exceptions: revoked token, HTTP error

    uri = f'https://www.googleapis.com/drive/v3/files/{sheet_id}/export?mimeType=text%2Fcsv'
    try:
        response = client.get(uri)
        body = response.text
        return (body, None)
    except ValueError as err:
        # Okay, this shouldn't be ValueError. TODO delete ValueError and handle actual errors.
        return (None, str(err))


class GoogleSheets(ModuleImpl):

    @staticmethod
    def render(wf_module, table):
        return wf_module.retrieve_fetched_table()

    @staticmethod
    def event(wfmodule, **kwargs):
        file_meta_json = wfmodule.get_param_raw('fileselect', 'custom')
        if not file_meta_json: return
        file_meta = json.loads(file_meta_json)
        sheet_id = file_meta['id']

        if sheet_id:
            maybe_token = wfmodule.get_param_secret_secret('google_credentials')
            new_data, error = get_spreadsheet(sheet_id, maybe_token)

            if error:
                table = pd.DataFrame()
            else:
                try:
                    table = pd.read_csv(io.StringIO(new_data))
                    error = ''
                except CParserError as e:
                    table = pd.DataFrame()
                    error = str(e)

            sanitize_dataframe(table)
            save_fetched_table_if_changed(wfmodule, table, error)
