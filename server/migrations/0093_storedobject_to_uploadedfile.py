# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-03-22 00:19
from __future__ import unicode_literals

from server.models import StoredObject,WfModule
from django.db import migrations, models
import django.db.models.deletion


# Remove all uploaded files. Will reset existing wf_modules, but hey, we have no users yet
def clear_upload_modules(apps, schema_editor):
    for wfm in WfModule.objects.filter(module_version__module__id_name='uploadfile'):
        StoredObject.objects.filter(wf_module=wfm).delete() # blows render caches too, makes this obvious to user
        wfm.status = WfModule.READY
        wfm.stored_data_version = None
        wfm.save()


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0092_deletemodulecommand_selected_wf_module'),
    ]

    operations = [
        migrations.RunPython(clear_upload_modules),  # run before schema changes, while we still have StoredObject uuid, name fields

        migrations.CreateModel(
            name='UploadedFile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='')),
                ('name', models.CharField(default=None, max_length=255, null=True)),
                ('size', models.IntegerField(default=0)),
                ('uuid', models.CharField(default=None, max_length=255, null=True)),
                ('wf_module',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='uploaded_files',
                                   to='server.WfModule')),
            ],
        ),
        migrations.RemoveField(
            model_name='storedobject',
            name='name',
        ),
        migrations.RemoveField(
            model_name='storedobject',
            name='uuid',
        ),
        migrations.AlterField(
            model_name='storedobject',
            name='type',
            field=models.CharField(choices=[('FETCHED_TABLE', 'FETCHED_TABLE'), ('CACHED_TABLE', 'CACHED_TABLE')],
                                   default='UNKNOWN', max_length=16)
        )
    ]
