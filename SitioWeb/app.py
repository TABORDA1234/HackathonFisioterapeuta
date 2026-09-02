# pyrefly: ignore [missing-import]
from flask import Flask, send_from_directory
import os

# Inicializar Flask app apuntando al directorio actual como static folder
app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    # Si el archivo existe, lo servimos
    if os.path.exists(os.path.join('.', path)):
        return send_from_directory('.', path)
    # Fallback a index.html (útil si luego hay enrutamiento en cliente)
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    print("Iniciando servidor frontend en http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=True)
