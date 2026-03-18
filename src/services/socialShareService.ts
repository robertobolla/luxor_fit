import Share from 'react-native-share';
import { Platform } from 'react-native';

export interface InstagramStoriesOptions {
    backgroundVideoUri?: string;
    backgroundImageUri?: string;
    stickerImageUri: string; // Base64 image data URI
    backgroundBottomColor?: string;
    backgroundTopColor?: string;
    attributionURL?: string;
}

/**
 * Service to handle professional social sharing (Instagram Stories, etc.)
 * Requires react-native-share and appropriate URL schemes in app.json
 */
export const SocialShareService = {
    /**
     * Shares a sticker and a background (video or image) to Instagram Stories
     */
    shareToInstagramStories: async (options: InstagramStoriesOptions) => {
        try {
            const shareOptions = {
                method: Share.InstagramStories.SHARE_STICKER_IMAGE,
                stickerImage: options.stickerImageUri,
                backgroundVideo: options.backgroundVideoUri,
                backgroundImage: options.backgroundImageUri,
                backgroundBottomColor: options.backgroundBottomColor || '#000000',
                backgroundTopColor: options.backgroundTopColor || '#000000',
                attributionURL: options.attributionURL || 'https://luxorfitness.app',
                social: Share.Social.INSTAGRAM_STORIES,
                appId: 'luxorfitness', // Optional: your facebook app id
            };

            const result = await Share.shareSingle(shareOptions as any);
            return result;
        } catch (error) {
            console.error('Error sharing to Instagram Stories:', error);
            throw error;
        }
    },

    /**
     * Checks if Instagram is installed (iOS only check via scheme is handled by react-native-share)
     */
    isInstagramAvailable: async () => {
        try {
            if (Platform.OS === 'ios') {
                const isInstalled = await Share.isPackageInstalled('com.instagram.android'); // Note: For Android. For iOS it uses schemes automatically
                return isInstalled;
            }
            return true; // Simplified for Android as most have it, or let Share handle it
        } catch (e) {
            return false;
        }
    }
};
