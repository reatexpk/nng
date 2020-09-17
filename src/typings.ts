export interface Post {
  text: string;
  from: string;
  timestamp: number;
}

export interface Schema {
  posts: Post[];
  count: number;
}
