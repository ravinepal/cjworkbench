# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-10-12 14:03
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0069_auto_20171002_2020'),
    ]

    operations = [
        migrations.AlterField(
            model_name='parameterspec',
            name='type',
            field=models.CharField(choices=[('statictext', 'Statictext'), ('string', 'String'), ('integer', 'Integer'), ('float', 'Float'), ('button', 'Button'), ('checkbox', 'Checkbox'), ('menu', 'Menu'), ('column', 'Column'), ('multicolumn', 'Multiple columns'), ('custom', 'Custom')], default='string', max_length=16),
        ),
    ]
