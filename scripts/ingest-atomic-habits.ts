/**
 * PDF Ingestion Script for Atomic Habits
 *
 * This script extracts text from the Atomic Habits PDF and chunks it
 * for embedding and storage in Pinecone.
 *
 * Usage: npx tsx scripts/ingest-atomic-habits.ts /path/to/atomic-habits.pdf
 */

import { getDocumentProxy, extractText } from 'unpdf';
import * as fs from 'fs';
import * as path from 'path';

// Chunk configuration
const CHUNK_SIZE = 500; // Target characters per chunk
const CHUNK_OVERLAP = 50; // Characters of overlap between chunks

/**
 * Find the best break point near the target position.
 * Priority: sentence end > word boundary
 */
function findBreakPoint(
  text: string,
  targetPos: number,
  minPos: number
): number {
  // Don't search beyond the text length
  const maxPos = Math.min(targetPos, text.length);

  // Look for sentence endings first (within last 150 chars)
  const searchStart = Math.max(maxPos - 150, minPos);

  for (let i = maxPos - 1; i >= searchStart; i--) {
    const char = text[i];
    const nextChar = text[i + 1] || ' ';

    // Sentence boundary: punctuation followed by space
    if ((char === '.' || char === '!' || char === '?') && nextChar === ' ') {
      return i + 2; // Include punctuation and space
    }
  }

  // No sentence boundary found, look for word boundary (space)
  for (let i = maxPos - 1; i >= searchStart; i--) {
    if (text[i] === ' ') {
      return i + 1; // Break after the space
    }
  }

  // No good break point found, just use target position
  return maxPos;
}

/**
 * Chunk text into smaller pieces for better retrieval.
 * Breaks at sentence or word boundaries to avoid cutting words.
 */
function chunkText(text: string): string[] {
  // Normalize whitespace first
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length <= CHUNK_SIZE) {
    return [normalizedText];
  }

  const chunks: string[] = [];
  let position = 0;

  while (position < normalizedText.length) {
    // Calculate target end position
    const targetEnd = position + CHUNK_SIZE;

    // Find the best break point
    let endPos: number;
    if (targetEnd >= normalizedText.length) {
      endPos = normalizedText.length;
    } else {
      endPos = findBreakPoint(normalizedText, targetEnd, position);
    }

    // Extract chunk
    const chunk = normalizedText.slice(position, endPos).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move position forward
    if (endPos >= normalizedText.length) {
      break;
    }

    // Calculate next position with overlap
    // Go back CHUNK_OVERLAP chars, but ensure we don't go before current position
    position = Math.max(endPos - CHUNK_OVERLAP, position + 1);

    // Make sure position is at a word boundary (after a space)
    while (
      position < normalizedText.length &&
      normalizedText[position - 1] !== ' '
    ) {
      position++;
    }
  }

  return chunks;
}

/**
 * Extract text from a PDF file using unpdf.
 */
async function extractPdfText(pdfPath: string): Promise<string> {
  console.log(`📄 Reading PDF: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/**
 * Main ingestion function.
 */
async function ingestBook() {
  const pdfPath = process.argv[2];

  if (!pdfPath) {
    console.error('❌ Error: Please provide a path to the PDF file');
    console.log(
      '\nUsage: npx tsx scripts/ingest-atomic-habits.ts /path/to/atomic-habits.pdf'
    );
    process.exit(1);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Error: PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Extract text from PDF
  const text = await extractPdfText(pdfPath);
  console.log(
    `✅ Extracted ${text.length.toLocaleString()} characters from PDF`
  );

  // Chunk the text
  console.log('⏳ Chunking text...');
  const chunks = chunkText(text);
  console.log(
    `✅ Created ${chunks.length} chunks (avg ${Math.round(text.length / chunks.length)} chars/chunk)`
  );

  // Verify no cut words (spot check)
  let cutWordCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Check if chunk ends mid-word (not with space, punctuation, or end of text)
    const lastChar = chunk[chunk.length - 1];
    if (!/[\s.!?,;:'"\-)]/.test(lastChar)) {
      cutWordCount++;
    }
  }
  if (cutWordCount > 0) {
    console.log(
      `⚠️  Warning: ${cutWordCount} chunks may have cut words at the end`
    );
  } else {
    console.log('✅ All chunks end at proper word boundaries');
  }

  // Save chunks for review
  const chunksPath = path.join(dataDir, 'chunks.json');
  fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2));
  console.log(`✅ Saved chunks to ${chunksPath}`);

  // Save chunk metadata (for reference)
  const metadata = {
    source: path.basename(pdfPath),
    totalCharacters: text.length,
    totalChunks: chunks.length,
    avgChunkSize: Math.round(text.length / chunks.length),
    chunkConfig: { CHUNK_SIZE, CHUNK_OVERLAP },
    createdAt: new Date().toISOString(),
  };
  const metadataPath = path.join(dataDir, 'chunks-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`✅ Saved metadata to ${metadataPath}`);

  console.log('\n🎉 Step 1 complete! Next steps:');
  console.log('1. Review chunks in data/chunks.json');
  console.log('2. Set environment variables:');
  console.log('   export CLOUDFLARE_ACCOUNT_ID=your_account_id');
  console.log('   export CLOUDFLARE_API_TOKEN=your_api_token');
  console.log('   export PINECONE_API_KEY=your_pinecone_api_key');
  console.log('3. Run: npx tsx scripts/generate-embeddings.ts');
}

ingestBook().catch((error) => {
  console.error('❌ Error during ingestion:', error);
  process.exit(1);
});
