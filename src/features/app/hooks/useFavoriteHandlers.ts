type UseFavoriteHandlersParams = {
  favoriteSelectedId: string | null;
  setFavoriteSelectedId: (value: string | null) => void;
  setSquareActionError: (value: string) => void;
  favoriteSquarePost: (args: { sourceMessageId: string }) => Promise<unknown>;
  unfavoriteSquarePost: (args: { sourceMessageId: string }) => Promise<unknown>;
  favoriteCapsule: (args: { capsuleId: string }) => Promise<unknown>;
  unfavoriteCapsule: (args: { capsuleId: string }) => Promise<unknown>;
};

export function useFavoriteHandlers(params: UseFavoriteHandlersParams) {
  const handleFavoriteSquare = async (sourceMessageId: string) => {
    params.setSquareActionError("");
    try {
      await params.favoriteSquarePost({ sourceMessageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setSquareActionError(msg || "藏進心底失敗");
    }
  };

  const handleUnfavoriteSquare = async (sourceMessageId: string) => {
    params.setSquareActionError("");
    try {
      await params.unfavoriteSquarePost({ sourceMessageId });
      if (params.favoriteSelectedId) params.setFavoriteSelectedId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setSquareActionError(msg || "從心底拿出失敗");
    }
  };

  const handleFavoriteCapsuleById = async (capsuleId: string) => {
    params.setSquareActionError("");
    try {
      await params.favoriteCapsule({ capsuleId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setSquareActionError(msg || "藏進心底失敗");
    }
  };

  const handleUnfavoriteCapsuleById = async (capsuleId: string) => {
    params.setSquareActionError("");
    try {
      await params.unfavoriteCapsule({ capsuleId });
      if (params.favoriteSelectedId) params.setFavoriteSelectedId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setSquareActionError(msg || "從心底拿出失敗");
    }
  };

  return {
    handleFavoriteSquare,
    handleUnfavoriteSquare,
    handleFavoriteCapsuleById,
    handleUnfavoriteCapsuleById,
  };
}
