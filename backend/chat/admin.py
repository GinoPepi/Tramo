from django.contrib import admin
from .models import Notebook, Document

class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0
    fields = ('title', 'file', 'status', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(Notebook)
class NotebookAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'total_documents')
    search_fields = ('name', 'description')
    inlines = [DocumentInline]

    @admin.display(description="Documents")
    def total_documents(self, obj):
        return obj.documents.count()

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'notebook', 'status', 'created_at')
    list_filter = ('status', 'notebook')
    search_fields = ('title', 'notebook__name')
    readonly_fields = ('created_at', 'updated_at')