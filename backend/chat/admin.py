from django.contrib import admin
from .models import Cuaderno, Documento


@admin.register(Cuaderno)
class CuadernoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'creado_el', 'total_documentos')
    search_fields = ('nombre', 'descripcion')

    def total_documentos(self, obj):
        return obj.documentos.count()
    total_documentos.short_description = "Documentos"


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'cuaderno', 'estado', 'total_paginas', 'creado_el')
    list_filter = ('estado', 'cuaderno')
    search_fields = ('titulo', 'cuaderno__nombre')