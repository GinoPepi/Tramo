def handle_message(message=None, file=None):
    # If a file was uploaded, return the file success message
    if file:
        print(f"Received file: {file.name}")
        return f"File Received! Name: {file.name}"
    
    # Otherwise, fallback to the text message logic
    if message:
        print(f"Received message: {message}")
        return f"Message received: \n{message}"
        
    return "No input provided!"