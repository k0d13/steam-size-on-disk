---
"size-on-disk": patch
---

Fix non-Steam games showing a much smaller size on disk than they take up, by reading each file's size in a way that doesn't wrap around for files over 2 GiB
