from django.db import models
from django.core.files.storage import default_storage
from django.dispatch import receiver
from django.utils import timezone
from pandas.util import hash_pandas_object
import pandas as pd
import os
import uuid
from shutil import copyfile

# StoredObject is our persistence layer.
# Allows WfModules to store keyed, versioned binary objects
class StoredObject(models.Model):
    # delete stored data if WfModule deleted
    wf_module = models.ForeignKey('WfModule', related_name='stored_objects', on_delete=models.CASCADE)

    # What format is this data in? Byte stream (used for uploaded file) or a Pandas table serialization?
    FETCHED_TABLE = 'FETCHED_TABLE'
    CACHED_TABLE = 'CACHED_TABLE'
    TYPE_CHOICES = (
        (FETCHED_TABLE, 'FETCHED_TABLE'),
        (CACHED_TABLE, 'CACHED_TABLE')
    )
    type=models.CharField(max_length=16, choices=TYPE_CHOICES, default='UNKNOWN') # if you ever see UNKNOWN in the db, it's bug

    # identification for file backing store
    file = models.FileField()
    stored_at = models.DateTimeField(default=timezone.now)

    # used only for stored tables
    hash = models.CharField(max_length=32)
    metadata = models.CharField(default=None, max_length=255, null=True)
    size = models.IntegerField(default=0) # file size

    # keeping track of whether this version of the data has ever been loaded
    # and delivered to the frontend
    read = models.BooleanField(default=False)

    def is_table(self):
        return self.type == StoredObject.FETCHED_TABLE or self.type == StoredObject.CACHED_TABLE

    # filename combines wf module id and our object id
    # (self.id is sufficient but putting wfm.id in the filename helps debugging)
    @staticmethod
    def _storage_filename(wfm_id, type):

        # prevent name collisions between the same table stored as a cache and a fetch
        if type == StoredObject.CACHED_TABLE:
            typestr = "-cache"
        else:
            typestr = '-fetch'

        fname = str(wfm_id) + '-' + str(uuid.uuid1()) + typestr + '.dat'
        return default_storage.path(fname)

    @staticmethod
    def _hash_table(table):
        h = hash_pandas_object(table).sum()  # xor would be nice, but whatevs
        h = h if h>0 else -h              # stay positive (sum often overflows)
        return str(h)

    @staticmethod
    def create_table(wf_module, type, table, metadata=None):
        if table is None or table.empty:
            return StoredObject.__create_empty_table(wf_module, type, metadata)
        else:
            hash = StoredObject._hash_table(table)
            return StoredObject.__create_table_internal(wf_module, type, table, metadata, hash)

    # Create a new StoredObject if it's going to store different data than the previous one. Otherwise null
    # Fast; checks hash without loading file contents
    @staticmethod
    def create_table_if_different(wf_module, old_so, type, table, metadata=None):
        if old_so is None:
            return StoredObject.create_table(wf_module, type, table, metadata=metadata)

        if type != old_so.type:
            ValueError('Cannot change StoredObject type when checking for changes')

        hash = StoredObject._hash_table(table)
        if hash != old_so.hash:
            return StoredObject.create_table(wf_module, type, table, metadata=metadata)
        else:
            return None

    @staticmethod
    def __create_table_internal(wf_module, type, table, metadata, hash):
        path = StoredObject._storage_filename(wf_module.id, type)
        table.to_parquet(path)
        return StoredObject.objects.create(
            wf_module=wf_module,
            type=type,
            metadata=metadata,
            file=path,
            size=os.stat(path).st_size,
            stored_at=timezone.now(),
            hash=hash
        )

    # why store an empty table? so we don't have to re-render to know that the output was empty
    @staticmethod
    def __create_empty_table(wf_module, type, metadata):
        return StoredObject.objects.create(
            wf_module=wf_module,
            type=type,
            metadata=metadata,
            file=None,
            size=0,
            stored_at=timezone.now(),
            hash=0
        )

    def get_table(self):
        if not self.is_table():
            raise TypeError("Cannot load uploaded file StoredObject into a table")

        if self.size==0:
            return pd.DataFrame() # empty table

        table = pd.read_parquet(self.file.name)
        return table

    # make a deep copy for another WfModule
    def duplicate(self, to_wf_module):
        if to_wf_module == self.wf_module:
            # Filename would clash, therefore we can't do that
            raise ValueError("Cannot duplicate a StoredObject to same WfModule")

        srcname = default_storage.path(self.file.name)
        new_path = StoredObject._storage_filename(to_wf_module.id, self.type)
        copyfile(srcname, new_path)
        new_so = StoredObject.objects.create(wf_module=to_wf_module,
                                             stored_at=self.stored_at,
                                             type=self.type,
                                             hash=self.hash,
                                             metadata=self.metadata,
                                             file = new_path,
                                             size = self.size)
        return new_so


# Delete file from filesystem when corresponding object is deleted.
@receiver(models.signals.post_delete, sender=StoredObject)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    if instance.file:
        if os.path.isfile(instance.file.path):
            os.remove(instance.file.path)
