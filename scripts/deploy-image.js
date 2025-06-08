#!/usr/bin/env node

import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function deployImages() {
  console.log('🖼️  Deploying Images to Vercel Blob...\n');
  
  // Check for Blob token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not found in environment variables');
    console.log('Run: vercel env pull .env.local');
    return;
  }

  // Define image files to deploy
  const imageFiles = [
    {
      localPath: 'src/assets/Futuristic aVOID with Fiery Meteors.png',
      blobPath: 'images/hero-image.png',
      description: 'Main hero image for aVOID game'
    },
    {
      localPath: 'archive/Don_tThankAi.png', 
      blobPath: 'images/stream-overlay.png',
      description: 'Stream overlay image'
    }
  ];

  const deployedUrls = [];

  for (const file of imageFiles) {
    try {
      // Check if file exists
      if (!fs.existsSync(file.localPath)) {
        console.log(`⚠️  File not found: ${file.localPath}`);
        continue;
      }

      // Read file
      const fileBuffer = fs.readFileSync(file.localPath);
      const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);
      
      console.log(`📤 Uploading: ${file.localPath} (${fileSize}MB)`);
      console.log(`   → Blob path: ${file.blobPath}`);

      // Upload to Vercel Blob
      const blob = await put(file.blobPath, fileBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      console.log(`✅ Success: ${blob.url}`);
      deployedUrls.push({
        description: file.description,
        localPath: file.localPath,
        blobPath: file.blobPath,
        url: blob.url,
        size: fileSize + 'MB'
      });

    } catch (error) {
      console.error(`❌ Failed to upload ${file.localPath}:`, error.message);
    }
  }

  // Output summary
  console.log('\n📋 DEPLOYMENT SUMMARY:');
  console.log('='.repeat(50));
  
  deployedUrls.forEach((item, index) => {
    console.log(`${index + 1}. ${item.description}`);
    console.log(`   Size: ${item.size}`);
    console.log(`   URL: ${item.url}`);
    console.log('');
  });

  // Generate config update
  if (deployedUrls.length > 0) {
    console.log('📝 Add these URLs to your imageConfig.ts:');
    console.log('='.repeat(50));
    console.log('export const imageConfig = {');
    deployedUrls.forEach(item => {
      const configKey = item.blobPath.split('/').pop().replace(/[^a-zA-Z0-9]/g, '');
      console.log(`  ${configKey}: "${item.url}",`);
    });
    console.log('};');
  }

  console.log(`\n🎉 Deployed ${deployedUrls.length} images successfully!`);
}

deployImages().catch(console.error); 