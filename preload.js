/**
 * Merlin - Electron Preload Script
 * Bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Transcribe video using Whisper
     * @param {string} videoPath - Path to video file
     * @returns {Promise<{words: Array}>} - Transcript with word-level timestamps
     */
    transcribeVideo: async (videoPath) => {
        return await ipcRenderer.invoke('transcribe-video', videoPath);
    },

    /**
     * Render video with captions using FFmpeg
     * @param {Object} params - Rendering parameters
     * @returns {Promise<{outputPath: string}>} - Path to rendered video
     */
    renderVideo: async (params) => {
        return await ipcRenderer.invoke('render-video', params);
    },

    /**
     * Listen for transcription progress updates
     * @param {Function} callback - Progress callback
     */
    onTranscriptionProgress: (callback) => {
        ipcRenderer.on('transcription-progress', (event, data) => callback(data));
    },

    /**
     * Listen for rendering progress updates
     * @param {Function} callback - Progress callback
     */
    onRenderProgress: (callback) => {
        ipcRenderer.on('render-progress', (event, data) => callback(data));
    },

    /**
     * Remove progress listeners
     */
    removeProgressListeners: () => {
        ipcRenderer.removeAllListeners('transcription-progress');
        ipcRenderer.removeAllListeners('render-progress');
    }
});
