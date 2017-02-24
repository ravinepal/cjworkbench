# -*- coding: utf-8 -*-
# Generated by Django 1.10.2 on 2016-11-29 20:57
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0007_auto_20161123_2115'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='wfmodule',
            options={'ordering': ['order']},
        ),
        migrations.RenameField(
            model_name='parameterspec',
            old_name='defaultVal',
            new_name='default',
        ),
        migrations.RemoveField(
            model_name='module',
            name='parameterSpecs',
        ),
        migrations.RemoveField(
            model_name='parameterval',
            name='numVal',
        ),
        migrations.RemoveField(
            model_name='parameterval',
            name='strVal',
        ),
        migrations.AddField(
            model_name='parameterspec',
            name='module',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='parameter_specs', to='server.Module'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='parameterval',
            name='number',
            field=models.FloatField(blank=True, null=True, verbose_name='number'),
        ),
        migrations.AddField(
            model_name='parameterval',
            name='string',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='string'),
        ),
        migrations.AddField(
            model_name='parameterval',
            name='text',
            field=models.TextField(blank=True, null=True, verbose_name='text'),
        ),
        migrations.AlterField(
            model_name='parameterval',
            name='type',
            field=models.CharField(choices=[('string', 'String'), ('number', 'Number'), ('text', 'Text')], default='number', max_length=8),
        ),
        migrations.AlterField(
            model_name='wfmodule',
            name='workflow',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='modules', to='server.Workflow'),
        ),
    ]