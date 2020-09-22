export interface Post {
  text: string;
  from: string;
  userId: number;
  timestamp: number;
}

export interface Schema {
  posts: Post[];
  count: number;
}
