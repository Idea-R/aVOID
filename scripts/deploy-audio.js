#!/usr/bin/env node
// Deploy Audio Files to CDN - Reduces project size

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUDIO_DIR = './public/audio';
const CDN_ENDPOINT = process.env.CDN_ENDPOINT || 'https://cdn.avoidgame.io';

async function deployAudioFiles() {
  console.log('🎵 Deploying audio files to CDN...');
  
  try {
    const audioFiles = fs.readdirSync(AUDIO_DIR);
    
    for (const file of audioFiles) {
      if (file.endsWith('.mp3')) {
        console.log(`📤 Uploading ${file}...`);
        
        // Example for different CDN providers:
        
        // 1. AWS S3 Upload (uncomment if using AWS)
        /*
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();
        const fileContent = fs.readFileSync(path.join(AUDIO_DIR, file));
        
        await s3.upload({
          Bucket: 'your-bucket',
          Key: `audio/${file}`,
          Body: fileContent,
          ContentType: 'audio/mpeg'
        }).promise();
        */
        
        // 2. Vercel Blob - ACTIVE DEPLOYMENT
        const { put } = await import('@vercel/blob');
        const fileContent = fs.readFileSync(path.join(AUDIO_DIR, file));
        
        const blob = await put(`audio/${file}`, fileContent, {
          access: 'public',
          contentType: 'audio/mpeg'
        });
        
        console.log(`📤 Uploaded to Vercel Blob: ${blob.url}`);
        console.log(`🔗 CDN URL: ${blob.url}`);
        
        // 3. GitHub Releases (free option)
        // Upload manually to GitHub Releases and use:
        // https://github.com/Idea-R/aVOID/releases/download/v1.0.0/Into-The-Void.mp3
        
        console.log(`✅ ${file} uploaded successfully`);
      }
    }
    
    console.log('🎉 All audio files deployed to CDN!');
    console.log('💡 You can now remove /public/audio/ from your project');
    
  } catch (error) {
    console.error('❌ Error deploying audio files:', error);
    process.exit(1);
  }
}

deployAudioFiles(); 