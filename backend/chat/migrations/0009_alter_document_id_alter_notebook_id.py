# Generated manually to cleanly transition from BigInt to UUID in PostgreSQL

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat', '0008_notebook_user'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Document',
        ),
        migrations.DeleteModel(
            name='Notebook',
        ),
        migrations.CreateModel(
            name='Notebook',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=150)),
                ('description', models.TextField(blank=True, null=True)),
                ('syllabus_text', models.TextField(blank=True, null=True)),
                ('syllabus_file', models.FileField(blank=True, null=True, upload_to='documents/syllabi/%Y/%m/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notebooks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notebook',
                'verbose_name_plural': 'Notebooks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('file', models.FileField(upload_to='documents/%Y/%m/')),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PROCESSING', 'Processing'), ('COMPLETED', 'Completed'), ('ERROR', 'Error')], default='PENDING', max_length=20)),
                ('tramos', models.JSONField(blank=True, default=list)),
                ('answers', models.JSONField(blank=True, default=dict)),
                ('temp_answers', models.JSONField(blank=True, default=dict)),
                ('syllabus_text', models.TextField(blank=True, null=True)),
                ('syllabus_file', models.FileField(blank=True, null=True, upload_to='documents/syllabi/%Y/%m/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notebook', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='chat.notebook')),
            ],
            options={
                'verbose_name': 'Document',
                'verbose_name_plural': 'Documents',
                'ordering': ['-created_at'],
            },
        ),
    ]
