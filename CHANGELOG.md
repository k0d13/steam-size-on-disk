# size-on-disk

## 1.3.2

### Patch Changes

- b36c80c: Detect a non-Steam game's folder again each time instead of keeping the first one found, so a shortcut that moves, such as an Epic game once installed, is measured where it is now, while keeping folders picked by hand
- ca27839: Hide the size of a non-Steam game marked not installed, such as an uninstalled Epic game, instead of measuring its launcher's folder

## 1.3.1

### Patch Changes

- 9964dc1: Fix non-Steam games showing a much smaller size on disk than they take up, by reading each file's size in a way that doesn't wrap around for files over 2 GiB

## 1.3.0

### Minor Changes

- 1dd5b51: Build with Starlight, so the plugin ships as a single `.star` file

### Patch Changes

- 7ad5ea1: Keep only the last 500 lines of the plugin's log
- aae8b5f: Keep the drive icon readable on light stats bar backgrounds
- 7ad5ea1: Show the size on disk with the rest of the stats bar instead of a moment after, ahead of achievements so it no longer moves when they load
- 88db7a8: Stop Steam reloading over and over while a non-Steam game is running, by not measuring its folder while it runs or more than once every 5 minutes

## 1.2.1

### Patch Changes

- 48011c2: Show the size on disk as soon as a library page opens, always in the same spot in the stats bar
- 1dca659: Fix sizes not showing on the latest Steam client

## 1.2.0

### Minor Changes

- 67cfdf7: Show size on disk for non-Steam games, measured from their shortcut's folder

## 1.1.0

### Minor Changes

- fc7d6f1: Add tooltip containing drive and extra content sizes
