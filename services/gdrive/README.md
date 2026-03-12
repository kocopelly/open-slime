# Google Drive Mount (rclone)

Mounts a shared Google Drive folder into the OpenClaw container at `workspace/gdrive/`.

## Setup

1. **Enable the Google Drive API** in your GCP project (if not already enabled)
2. **Create a folder** in Google Drive
3. **Share it** with your service account email as **Editor**
4. **Get the folder ID** from the Drive URL:
   - `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
5. **Add to `.env`**:
   ```
   GDRIVE_ROOT_FOLDER_ID=your_folder_id_here
   ```
6. **docker compose up -d gdrive** and restart the gateway

## How it works

- Uses `rclone mount` with a Google service account (no OAuth needed)
- VFS cache mode `full` — reads and writes are cached locally for speed
- Poll interval 30s — changes from Drive appear within ~30 seconds
- The mount appears at `/home/node/.openclaw/workspace/gdrive/` inside the container

## Per-project usage

Create subdirectories in the Drive folder for each project that needs shared artifacts:

```
<drive-root>/
  project-a/
  project-b/
```

Projects reference their Drive folder via `workspace/gdrive/<project>/`.
Local-only projects just stay in `workspace/projects/` — no Drive needed.
