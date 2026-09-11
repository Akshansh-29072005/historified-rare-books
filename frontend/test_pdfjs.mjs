import { getDocument } from 'pdfjs-dist/build/pdf.mjs';

async function test() {
  const url = "https://backend-staging.akshanshkhairwar2.workers.dev/api/reader/52118b23-3144-48d1-babc-c9b9a57dd4be/sample-pdf";
  console.log("Fetching PDF:", url);
  const loadingTask = getDocument({
    url: url,
    rangeChunkSize: 262144,
    disableStream: false,
    disableAutoFetch: true,
  });
  
  loadingTask.onProgress = (p) => {
    console.log("Progress:", p.loaded, "/", p.total);
  };

  const doc = await loadingTask.promise;
  console.log("Loaded PDF with pages:", doc.numPages);
}

test().catch(console.error);
