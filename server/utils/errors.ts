import { H3Error } from 'h3';

export const handleApiError = (
  error: unknown,
  options?: {
    statusCode?: number;
    statusMessage?: string;
  }
) => {
  if (error instanceof H3Error) {
    throw error;
  }

  if (error instanceof Error) {
    throw createError({
      statusCode: options?.statusCode ?? 500,
      statusMessage: options?.statusMessage ?? 'Internal Server Error',
      data: { message: error.message },
    });
  }

  throw createError({
    statusCode: options?.statusCode ?? 500,
    statusMessage: options?.statusMessage ?? 'Internal Server Error',
  });
};
