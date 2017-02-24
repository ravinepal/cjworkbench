# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-02-23 23:39
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0021_auto_20170222_0321'),
    ]

    operations = [
        migrations.AddField(
            model_name='parameterspec',
            name='def_ui_only',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='parameterval',
            name='ui_only',
            field=models.BooleanField(default=True),
        ),
    ]