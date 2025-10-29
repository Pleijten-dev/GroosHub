// Chat types
export interface Chat {
  id: string;
  userId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatInput {
  userId: number;
  title: string;
}

export interface UpdateChatInput {
  title?: string;
}
