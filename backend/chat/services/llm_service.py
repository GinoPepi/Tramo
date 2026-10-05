from chat.models import Document

def create_tramos(document: Document, programa: str):

    if document.tramos:
        return document.tramos

    tramos_data = [
      {
        "id": 1,
        "titulo": "ASDASD TEST 2",
        "paginas": 'Páginas 1 a 5',
        "foco": 'Identificar la hipótesis de partida y el concepto principal.',
        "preguntas": [
          '¿Cuál es la tesis central que plantea el autor en este tramo?',
          '¿Cómo se vincula esta definición con el eje de la materia?',
        ],
      },
      {
        "id": 2,
        "titulo": 'Marco Teórico y Definiciones',
        "paginas": 'Páginas 1 a 5',
        "foco": 'Identificar la hipótesis de partida y el concepto principal.',
        "preguntas": [
          '¿Cuál es la tesis central que plantea el autor en este tramo?',
          '¿Cómo se vincula esta definición con el eje de la materia?',
        ],
      },
      {
        "id": 3,
        "titulo": 'Desarrollo y Casos de Estudio',
        "paginas": 'Páginas 6 a 12',
        "foco": 'Prestar atención a los límites metodológicos que señala el texto.',
        "preguntas": [
          '¿Qué evidencia o ejemplo utiliza para respaldar su postura?',
          '¿Qué contradicciones señala frente a autores previos?',
        ],
      },
      {
        "id": 4,
        "titulo": 'Conclusiones y Cierre',
        "paginas": 'Páginas 13 a 18',
        "foco": 'Sintetizar las ideas para responder preguntas de examen.',
        "preguntas": [
          '¿A qué síntesis arriba el autor?',
          'En una frase: ¿cuál es el aporte clave que debés recordar?',
        ],
      },
    ]
    
    document.tramos = tramos_data
    document.status = Document.ProcessingStatus.COMPLETED
    document.save(update_fields=['tramos', 'status'])
    return document.tramos