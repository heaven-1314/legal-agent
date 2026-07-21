"""Text extract + simple chunking for V0."""
from __future__ import annotations

from pathlib import Path


def extract_text(path: Path, content_type: str | None = None) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".json"}:
        return path.read_text(encoding="utf-8", errors="replace")
    if suffix == ".pdf":
        return _extract_pdf(path)
    if suffix in {".docx"}:
        return _extract_docx(path)
    # fallback: try utf-8
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def _extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    parts: list[str] = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def _extract_docx(path: Path) -> str:
    from docx import Document

    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text).strip()


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        chunks.append(text[start:end])
        if end >= n:
            break
        start = max(0, end - overlap)
    return chunks
