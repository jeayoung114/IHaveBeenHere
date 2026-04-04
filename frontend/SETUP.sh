#!/bin/bash
# Run this script ONCE to initialize the frontend from the oh-my-rn boilerplate.
# It copies all boilerplate files (without overwriting the new files already written),
# installs dependencies, and installs expo-image-picker.

set -e

BOILERPLATE="/Users/jaeyoung/Desktop/work/exploration/oh-my-rn"
FRONTEND="/Users/jaeyoung/Desktop/work/vibe_coding/subagent/IHaveBeenHere/frontend"

echo "Copying boilerplate files (skipping files already customized)..."

# Copy everything from boilerplate but do NOT overwrite files we already created:
# - app.config.ts        (customized)
# - constants/index.ts   (customized)
# - lib/theme.ts         (customized)
# - stores/settingsStore.ts (customized)
# - app/(tabs)/_layout.tsx  (customized)
# - app/(tabs)/index.tsx    (customized)
# - .env                    (already exists)

rsync -av --ignore-existing \
  --exclude='.env' \
  --exclude='app.config.ts' \
  --exclude='constants/index.ts' \
  --exclude='lib/theme.ts' \
  --exclude='lib/api.ts' \
  --exclude='stores/settingsStore.ts' \
  --exclude='stores/mealStore.ts' \
  --exclude='app/(tabs)/_layout.tsx' \
  --exclude='app/(tabs)/index.tsx' \
  --exclude='app/(tabs)/search.tsx' \
  --exclude='app/(tabs)/camera.tsx' \
  --exclude='app/(tabs)/map.tsx' \
  --exclude='app/(tabs)/profile.tsx' \
  --exclude='components/MealCard.tsx' \
  --exclude='app/log/' \
  --exclude='node_modules' \
  --exclude='.git' \
  "$BOILERPLATE/" "$FRONTEND/"

echo "Installing npm dependencies..."
cd "$FRONTEND"
npm install

echo "Installing expo-image-picker..."
npx expo install expo-image-picker

echo ""
echo "Setup complete! Run 'npx expo start' to launch the app."
