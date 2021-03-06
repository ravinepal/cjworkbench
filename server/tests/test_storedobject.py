from server.models import StoredObject
from server.sanitizedataframe import sanitize_dataframe
from server.tests.utils import *
from django.test import override_settings
import tempfile
import pandas as pd
import os
import json

# don't clutter media directory with our tests (and don't accidentally succeed because of files there)
@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class StoredObjectTests(TestCase):

    def setUp(self):
        self.workflow = create_testdata_workflow()
        self.wfm1 = WfModule.objects.first()
        self.wfm2 = add_new_wf_module(self.workflow, ModuleVersion.objects.first(), 1)  # order = 1
        self.test_data = 'stored data'.encode()
        self.metadata = 'metadataish'

        # Use a more realistic test table with lots of data of different types
        # mock data wasn't finding bugs related to dict-type columns
        fname = os.path.join(settings.BASE_DIR, 'server/tests/test_data/sfpd.json')
        sfpd = json.load(open(fname))
        self.test_table = pd.DataFrame(sfpd)
        sanitize_dataframe(self.test_table)


    def file_contents(self, file_obj):
        file_obj.open(mode='rb')
        data = file_obj.read()
        file_obj.close()
        return data


    def test_store_fetched_table(self):
        so1 = StoredObject.create_table(self.wfm1,
                                        StoredObject.FETCHED_TABLE,
                                        self.test_table,
                                        self.metadata)
        self.assertEqual(so1.type, StoredObject.FETCHED_TABLE)
        self.assertEqual(so1.metadata, self.metadata )
        table2 = so1.get_table()
        self.assertTrue(table2.equals(self.test_table))


    def test_store_cached_table(self):
        so1 = StoredObject.create_table(self.wfm1,
                                        StoredObject.CACHED_TABLE,
                                        self.test_table,
                                        metadata=self.metadata)
        self.assertEqual(so1.type, StoredObject.CACHED_TABLE)
        self.assertEqual(so1.metadata, self.metadata )
        self.assertEqual(so1.size, os.stat(so1.file.name).st_size)
        table2 = so1.get_table()
        self.assertTrue(table2.equals(self.test_table))


    def test_type_interference(self):
        # if different types use the same filename -- perhaps because they have the same content -- we have problems
        # actually happened during development (module fetch and module cache can be the same data for add data module)
        so1 = StoredObject.create_table(self.wfm1,
                                        StoredObject.CACHED_TABLE,
                                        self.test_table)
        so2 = StoredObject.create_table(self.wfm1,
                                        StoredObject.FETCHED_TABLE,
                                        self.test_table)

        self.assertNotEqual(so1.file.path, so2.file.path)
        so1.delete()
        so2.get_table()


    def test_store_empty_table(self):
        so1 = StoredObject.create_table(self.wfm1,
                                        StoredObject.CACHED_TABLE,
                                        None,
                                        metadata=self.metadata)
        self.assertEqual(so1.type, StoredObject.CACHED_TABLE)
        self.assertEqual(so1.metadata, self.metadata )
        self.assertEqual(so1.size, 0)
        table2 = so1.get_table()
        self.assertTrue(table2.empty)


    def test_nan_storage(self):
        # have previously run into problems serializing / deserializing NaN values
        test_csv = 'Class,M,F\n' \
                   'math,10,12\n' \
                   'english,,7\n' \
                   'history,11,13\n' \
                   'economics,20,20'
        test_table = pd.read_csv(io.StringIO(test_csv))
        test_table_M = pd.DataFrame(test_table['M'])  # need DataFrame ctor otherwise we get series not df

        so = StoredObject.create_table(self.wfm1, StoredObject.FETCHED_TABLE, test_table_M)
        table_out = so.get_table()
        self.assertTrue(table_out.equals(test_table_M))


    def test_create_table_if_different(self):
        so1 = StoredObject.create_table(self.wfm1, StoredObject.FETCHED_TABLE, mock_csv_table)

        so2 = StoredObject.create_table_if_different(self.wfm1, so1, StoredObject.FETCHED_TABLE, mock_csv_table)
        self.assertIsNone(so2)

        so3 = StoredObject.create_table_if_different(self.wfm1, so1, StoredObject.FETCHED_TABLE, mock_csv_table2)
        self.assertIsNotNone(so3)
        table3 = so3.get_table()
        self.assertTrue(table3.equals(mock_csv_table2))


    # Duplicate from one wfm to another, tests the typical WfModule duplication case
    def test_duplicate_table(self):
        so1 = StoredObject.create_table(self.wfm1, StoredObject.FETCHED_TABLE, mock_csv_table)
        so2 = so1.duplicate(self.wfm2)

        # new StoredObject should have same time, same type, same metadata, different file with same contents
        self.assertEqual(so1.stored_at, so2.stored_at)
        self.assertEqual(so1.type, so2.type)
        self.assertEqual(so1.metadata, so2.metadata)
        self.assertNotEqual(so1.file, so2.file)

        self.assertEqual(self.file_contents(so1.file), self.file_contents(so2.file))
        self.assertTrue(so1.get_table().equals(so2.get_table()))

