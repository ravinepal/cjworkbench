# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-01-09 01:49
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0082_storedobject_read'),
    ]

    operations = [
        migrations.AlterField(
            model_name='wfmodule',
            name='update_interval',
            field=models.IntegerField(default=86400),
        ),
    ]
