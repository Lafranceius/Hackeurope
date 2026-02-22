import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from main import main  # your async function: async def main(file_path: str)

app = FastAPI()

# Allow your Next.js frontend on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/hello")
def hello():
    return {"message": "Hello from Python backend!"}


# Folder where uploaded files will be stored
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # 1) Basic validation
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files (.xlsx, .xls) are supported",
        )

    # 2) Create a unique filename to avoid collisions
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    saved_path = UPLOAD_DIR / unique_name

    try:
        # 3) Save uploaded file to disk
        with saved_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 4) Run your async pipeline on the saved file
        await main(str(saved_path))

        # 5) Return success response
        return {
            "success": True,
            "filename": file.filename,
            "saved_path": str(saved_path),
            "message": "Pipeline completed successfully",
        }

    except HTTPException:
        # Re-raise FastAPI HTTP errors untouched
        raise

    except Exception as e:
        # Optional cleanup if processing fails
        if saved_path.exists():
            try:
                saved_path.unlink()
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Pipeline failed: {str(e)}",
        )

    finally:
        # Close the uploaded file handle
        await file.close()


# if __name__ == "__main__":
#     uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
