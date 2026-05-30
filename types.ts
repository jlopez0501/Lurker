export interface RedditPost {
  id: string;
  title: string;
  url: string;
  over_18: boolean;
  is_video: boolean;
  score: number;
  num_comments: number;
  subreddit: string;
  media?: {
    reddit_video?: {
      fallback_url: string;
      height: number;
      width: number;
    };
    type?: string;
    oembed?: {
      thumbnail_url: string;
      width: number;
      height: number;
      type: string;
      html: string;
    };
  };
  preview?: {
    images: [{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }];
  };
}
