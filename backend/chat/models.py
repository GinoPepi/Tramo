from django.db import models
from pathlib import Path

class Notebook(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notebook"
        verbose_name_plural = "Notebooks"
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class Document(models.Model):
    class ProcessingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        ERROR = 'ERROR', 'Error'

    notebook = models.ForeignKey(
        Notebook,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='documents/%Y/%m/')
    status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING
    )
    tramos = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.title and self.file:
            self.title = Path(self.file.name).stem
            
        super().save(*args, **kwargs) 


    def __str__(self):
        return f"{self.title} — {self.notebook.name}"