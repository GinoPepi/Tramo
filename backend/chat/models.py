from django.db import models


class Cuaderno(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cuaderno"
        verbose_name_plural = "Cuadernos"
        ordering = ['-creado_el']

    def __str__(self):
        return self.nombre


class Documento(models.Model):
    class EstadoProcesamiento(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        PROCESANDO = 'PROCESANDO', 'Procesando'
        COMPLETADO = 'COMPLETADO', 'Completado'
        ERROR = 'ERROR', 'Error'

    cuaderno = models.ForeignKey(
        Cuaderno,
        on_delete=models.CASCADE,
        related_name='documentos'
    )
    titulo = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='documentos/%Y/%m/')
    total_paginas = models.PositiveIntegerField(default=0)
    estado = models.CharField(
        max_length=20,
        choices=EstadoProcesamiento.choices,
        default=EstadoProcesamiento.PENDIENTE
    )
    texto_completo = models.TextField(blank=True, null=True)  
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"
        ordering = ['-creado_el']

    def __str__(self):
        return f"{self.titulo} — {self.cuaderno.nombre}"