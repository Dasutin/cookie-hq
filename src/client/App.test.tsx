// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const requestItem = {
  id: 'request-1',
  name: 'Star Wand',
  maxSizeInches: 4,
  sizeAxis: 'width',
  mirrorImage: false,
  dueDate: '2026-06-12',
  archived: false,
  createdAt: '2026-05-28T12:00:00.000Z',
  updatedAt: '2026-05-28T12:00:00.000Z',
  pngFile: {
    originalName: 'star.png',
    storedName: 'star.png',
    mimeType: 'image/png',
    sizeBytes: 123,
    uploadedAt: '2026-05-28T12:00:00.000Z'
  },
  fusionFile: null,
  printFile: null,
  modelPreviewFile: null
};

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('archived=true')) {
          return Promise.resolve(new Response(JSON.stringify({ cutters: [] })));
        }
        return Promise.resolve(new Response(JSON.stringify({ cutters: [requestItem] })));
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the requests table with fetched cookie cutters', async () => {
    render(
      <MantineProvider defaultColorScheme="auto">
        <App />
      </MantineProvider>
    );

    expect(await screen.findAllByText('Star Wand')).toHaveLength(2);
    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
