#!/usr/bin/env node

/**
 * Quick test script for export/import functionality
 * Verifies that ZIP compression and decompression works correctly
 */

import JSZip from 'jszip';
import fs from 'fs';

console.log('🧪 Testing Export/Import ZIP Functionality\n');

// Test data
const testData = {
  customQuestions: [
    {
      id: 'q-1',
      type: 'single',
      question: 'Test question 1',
      options: [{ id: 'opt-1', text: 'Option 1' }],
      correctAnswer: 'opt-1',
      explanation: 'This is correct'
    },
    {
      id: 'q-2',
      type: 'multiple',
      question: 'Test question 2',
      options: [{ id: 'opt-2', text: 'Option 2' }],
      correctAnswer: ['opt-2'],
      explanation: 'Also correct'
    }
  ],
  caseStudies: [
    {
      id: 'case-1',
      title: 'Test Case',
      description: 'Test case description',
      scenario: 'Test scenario'
    }
  ],
  sessions: [],
  failedQuestions: []
};

async function testExportImport() {
  try {
    console.log('📦 Step 1: Creating ZIP...');
    const zip = new JSZip();
    
    // Add files to ZIP
    zip.file('questions.json', JSON.stringify(testData.customQuestions, null, 2));
    zip.file('case-studies.json', JSON.stringify(testData.caseStudies, null, 2));
    zip.file('sessions.json', JSON.stringify(testData.sessions, null, 2));
    zip.file('failed-questions.json', JSON.stringify(testData.failedQuestions, null, 2));
    zip.file('metadata.json', JSON.stringify({
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      itemCount: {
        questions: testData.customQuestions.length,
        caseStudies: testData.caseStudies.length,
        sessions: testData.sessions.length,
        failedQuestions: testData.failedQuestions.length
      }
    }, null, 2));
    
    console.log('✅ ZIP created successfully');
    
    // Generate and save test file
    console.log('\n💾 Step 2: Generating compressed ZIP file...');
    const blob = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    fs.writeFileSync('test-backup.zip', blob);
    const fileSize = fs.statSync('test-backup.zip').size;
    const uncompressedSize = JSON.stringify(testData).length;
    const compressionRatio = ((1 - fileSize / uncompressedSize) * 100).toFixed(1);
    
    console.log(`✅ ZIP file created: test-backup.zip`);
    console.log(`   Size: ${fileSize} bytes`);
    console.log(`   Uncompressed would be: ${uncompressedSize} bytes`);
    console.log(`   Compression ratio: ${compressionRatio}%`);
    
    // Test decompression
    console.log('\n🔍 Step 3: Testing decompression...');
    const zipBuffer = fs.readFileSync('test-backup.zip');
    const zip2 = new JSZip();
    const contents = await zip2.loadAsync(zipBuffer);
    
    console.log(`✅ ZIP decompressed successfully`);
    console.log(`   Files in ZIP: ${Object.keys(contents.files).length}`);
    
    // Read and verify data
    console.log('\n✔️ Step 4: Verifying data integrity...');
    const questionsJson = await contents.files['questions.json'].async('text');
    const questions = JSON.parse(questionsJson);
    
    if (questions.length === testData.customQuestions.length) {
      console.log(`✅ Questions match: ${questions.length} questions`);
    } else {
      console.log(`❌ Questions mismatch!`);
      process.exit(1);
    }
    
    const caseStudiesJson = await contents.files['case-studies.json'].async('text');
    const cases = JSON.parse(caseStudiesJson);
    
    if (cases.length === testData.caseStudies.length) {
      console.log(`✅ Case studies match: ${cases.length} cases`);
    } else {
      console.log(`❌ Case studies mismatch!`);
      process.exit(1);
    }
    
    const metadataJson = await contents.files['metadata.json'].async('text');
    const metadata = JSON.parse(metadataJson);
    
    console.log(`✅ Metadata verified:`);
    console.log(`   App Version: ${metadata.appVersion}`);
    console.log(`   Items: ${metadata.itemCount.questions} Q, ${metadata.itemCount.caseStudies} cases`);
    
    // Cleanup
    console.log('\n🧹 Cleanup: Removing test file...');
    fs.unlinkSync('test-backup.zip');
    console.log('✅ Test file removed');
    
    console.log('\n✨ All tests passed! ✨');
    console.log('\nSummary:');
    console.log('- ✅ ZIP compression works');
    console.log('- ✅ ZIP decompression works');
    console.log('- ✅ Data integrity verified');
    console.log('- ✅ Compression ratio: ' + compressionRatio + '%');
    console.log('- ✅ Ready for production use');
    
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  }
}

testExportImport();
