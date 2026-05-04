import {
  Coins,
  Package,
  Star,
  User,
  Lock,
  Globe,
  Trash2,
  Settings2,
  Eye,
  EyeOff,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";

import { cn } from "../../../lib/utils";
import type { SpaceFeedItem } from "../types";
import { GenderIcon } from "./PickerControls";
// 🔑 引入剛剛改造好的發布組件
import { PublishModalSection } from "./PublishModalSection"; 

type CapsuleTypeMeta = {
  chipClass: string;
  label: string;
};

type SpaceMainSectionProps = {
  isOwnSpace: boolean;
  spaceTargetDisplayName?: string;
  avatarImageUrl?: string;
  profileGender?: string;
  profileNote?: string;
  titleLabel?: string;
  titleWatermark?: string; // 🔑 補回這個
  titleTone?:
    | "stardust"
    | "glimmer"
    | "meteor"
    | "satellite"
    | "planet"
    | "star"
    | "galaxy"
    | "universe"
    | "creator";
  availablePoints?: number;
  spaceFeed: SpaceFeedItem[];
  capsuleTypeMeta: (capsuleType: number | undefined) => CapsuleTypeMeta;
  isCapsulePublicInSpace: (capsuleId: string) => boolean;
  onDeleteCapsule: (capsuleId: string) => void;
  onToggleCapsuleVisibility: (capsuleId: string, nextPublic: boolean) => void;
  onUnpublishSquare: (sourceMessageId: string) => void;
  onJumpToChatFromCapsule: (capsuleId: string) => void;
  onViewOriginalSquarePost: (sourceMessageId: string) => void;
  // 🔑 增加更新配置的回調
  onUpdateSquareConfig: (args: {
    sourceMessageId: string;
    description: string;
    repliesPublic: boolean;
    showSenderOnSquare: boolean;
    showRecipientOnSquare: boolean;
  }) => Promise<void>;
};

export function SpaceMainSection({
  isOwnSpace,
  spaceTargetDisplayName,
  avatarImageUrl,
  profileGender,
  profileNote,
  titleLabel = "星塵",
  titleWatermark = "", // 🔑 補回解構
  titleTone = "stardust",
  availablePoints = 0,
  spaceFeed,
  capsuleTypeMeta,
  isCapsulePublicInSpace,
  onDeleteCapsule,
  onToggleCapsuleVisibility,
  onUnpublishSquare,
  onUpdateSquareConfig,
  onJumpToChatFromCapsule,
  onViewOriginalSquarePost,
}: SpaceMainSectionProps) {
  const [deleteCapsuleId, setDeleteCapsuleId] = useState<string | null>(null);
  const [unpublishPostId, setUnpublishPostId] = useState<string | null>(null);

  // 🔑 編輯 Modal 專用 State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editRepliesPublic, setEditRepliesPublic] = useState(true);
  const [editShowSender, setEditShowSender] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-20 md:px-6">
      {/* 個人資料卡片部分 */}
      <div className={cn("ys-mine-profile-card md:hidden", `ys-mine-profile-card--${titleTone}`)}>
        {titleWatermark ? (
          <span className={cn("ys-title-watermark", `ys-title-watermark--${titleTone}`)}>
            {titleWatermark}
          </span>
        ) : null}
        <div className="ys-mine-profile-card-row">
          <div className={cn("ys-mine-avatar-slot", `ys-mine-avatar-slot--${titleTone}`)}>
            {avatarImageUrl ? (
              <img src={avatarImageUrl} alt="" className="h-full w-full rounded-[24px] object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-6 w-6 text-white/80" />
              </div>
            )}
          </div>
          <div className="ys-mine-profile-hitbox">
            <div className="ys-mine-profile-main">
              <p className="ys-mine-name">{spaceTargetDisplayName || (isOwnSpace ? "我的空間" : "一位朋友")}</p>
              <div className="ys-mine-level-row">
                <div className="ys-mine-level-chip">
                  <Star className="h-2.5 w-2.5" strokeWidth={2.6} />
                  <span>{titleLabel}</span>
                </div>
                {isOwnSpace ? (
                  <span className="ys-mine-points-chip">
                    <Coins className="h-3 w-3" strokeWidth={2.2} />
                    <span>{availablePoints}</span>
                  </span>
                ) : (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/[0.06]">
                    <GenderIcon gender={profileGender} />
                  </span>
                )}
              </div>
              <p className="ys-mine-shuoshuo-row min-w-0 flex-1 truncate text-white/80">
                {profileNote?.trim() || "尚無說說"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed 列表 */}
      <div className="space-y-4">
        {spaceFeed.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-white/10 py-16 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-white/20" />
            <p className="text-[15px] font-bold text-[#8E8E93]">目前沒有內容</p>
          </div>
        ) : (
          spaceFeed.map((item) => {
            const isCapsule = item.kind === "capsule";
            const isSquare = item.kind === "square";
            const capsuleId = isCapsule ? item.capsule.id : item.post.sourceMessageId;
            const isPublic = isCapsule ? isCapsulePublicInSpace(capsuleId) : true;
            const dateStr = new Date(Number(item.micros / 1000n)).toLocaleDateString("zh-TW");

            return (
              <div key={item.key} className={cn(
                "cd-card-raised relative overflow-hidden rounded-2xl p-5 transition-all border",
                isSquare ? "border-violet-500/20 bg-violet-500/5 shadow-[0_8px_30px_rgb(139,92,246,0.05)]" : "border-white/5 bg-[#1A1B22]"
              )}>
                {/* 頂部標籤 */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] font-black",
                      isCapsule ? capsuleTypeMeta(item.capsule.capsuleType).chipClass : "border-violet-400/30 bg-violet-400/10 text-violet-300"
                    )}>
                      {isCapsule ? `#${capsuleTypeMeta(item.capsule.capsuleType).label}` : "💬 對話記錄分享"}
                    </span>
                    {isOwnSpace && isCapsule && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#8E8E93]">
                        {isPublic ? <Globe className="h-3 w-3 text-emerald-400" /> : <Lock className="h-3 w-3" />}
                        {isPublic ? "公開展示" : "僅己可見"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold tabular-nums text-[#8E8E93]">{dateStr}</p>
                </div>

                {/* 內容區 */}
                <div className="space-y-3">
                  {isSquare && (item.post as any).description && (
                    <p className="text-[14px] font-black text-violet-300 italic">「{(item.post as any).description}」</p>
                  )}
                  <div className={cn(
                    "whitespace-pre-wrap leading-relaxed",
                    isSquare ? "rounded-xl bg-white/[0.03] p-4 border border-white/5 text-[14px] italic text-white/70" : "text-[15px] text-white/90"
                  )}>
                    {isCapsule ? item.capsule.content : item.post.snapshotContent}
                  </div>
                </div>

                {/* 底部操作 */}
                <div className="mt-5 flex items-center justify-between border-t border-dashed border-white/10 pt-4">
                  <div className="flex gap-4">
                    {isOwnSpace && (
                      isCapsule ? (
                        <button onClick={() => onToggleCapsuleVisibility(capsuleId, !isPublic)} className={cn("flex items-center gap-1 text-[11px] font-bold", isPublic ? "text-amber-400" : "text-emerald-400")}>
                          {isPublic ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}
                          {isPublic ? "空間隱藏" : "空間展示"}
                        </button>
                      ) : (
                        <button onClick={() => {
                          setEditingPost(item.post);
                          setEditDesc((item.post as any).description || "");
                          setEditRepliesPublic(item.post.repliesPublic);
                          setEditShowSender(item.post.showSenderOnSquare);
                          setIsEditModalOpen(true);
                        }} className="text-[11px] font-bold text-violet-300 flex items-center gap-1">
                          <Settings2 className="h-3.5 w-3.5" /> 修改分享設定
                        </button>
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isOwnSpace && (
                      <button onClick={() => isCapsule ? setDeleteCapsuleId(item.capsule.id) : setUnpublishPostId(item.post.sourceMessageId)} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isSquare && <button onClick={() => onViewOriginalSquarePost(item.post.sourceMessageId)} className="text-[11px] font-bold text-white/40 underline underline-offset-4">查看原貼</button>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🔑 復用發布彈窗組件來處理編輯 */}
      <PublishModalSection
        mode="edit"
        isPublishModalVisible={isEditModalOpen}
        canRenderPublishModal={true}
        loading={isSaving}
        publishDescription={editDesc}
        onSetPublishDescription={setEditDesc}
        publishRepliesPublic={editRepliesPublic}
        onSetPublishRepliesPublic={setEditRepliesPublic}
        publishShowSender={editShowSender}
        onSetPublishShowSender={setEditShowSender}
        onClosePublishModal={() => setIsEditModalOpen(false)}
        onSubmitPublishToSquare={async () => {
          if (!editingPost) return;
          setIsSaving(true);
          try {
            await onUpdateSquareConfig({
              sourceMessageId: editingPost.sourceMessageId,
              description: editDesc,
              repliesPublic: editRepliesPublic,
              showSenderOnSquare: editShowSender,
              showRecipientOnSquare: true, // 預設值
            });
            setIsEditModalOpen(false);
          } finally {
            setIsSaving(false);
          }
        }}
        // 編輯模式不改這些，傳入預設值
        isDirectMode={true}
        publishIncludeThread={false}
        publishIncludeCapsulePrivate={false}
        publishShowRecipient={true}
        onSetPublishIncludeThread={() => {}}
        onSetPublishIncludeCapsulePrivate={() => {}}
        onSetPublishShowRecipient={() => {}}
      />

      {/* 原本的刪除與下架彈窗保持不變 */}
      {deleteCapsuleId && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/55 p-4" onClick={() => setDeleteCapsuleId(null)}>
          <div role="dialog" className="w-full max-w-[22rem] rounded-2xl border border-white/15 bg-[#121319] p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-white">刪除這顆膠囊？</p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">刪除後會同時從你的空間與廣場顯示中移除，且不可復原。</p>
            <div className="mt-4 flex gap-2">
              <button className="cd-btn-ghost min-w-0 flex-1 py-2" onClick={() => setDeleteCapsuleId(null)}>取消</button>
              <button className="min-w-0 flex-1 rounded-xl border border-red-500/35 bg-red-500/10 py-2 text-[13px] font-bold text-red-300" onClick={() => { onDeleteCapsule(deleteCapsuleId); setDeleteCapsuleId(null); }}>確認刪除</button>
            </div>
          </div>
        </div>
      )}

      {unpublishPostId && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/55 p-4" onClick={() => setUnpublishPostId(null)}>
          <div role="dialog" className="w-full max-w-[22rem] rounded-2xl border border-white/15 bg-[#121319] p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-white">撤下廣場內容？</p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">撤下後，這則內容將不再出現在廣場牆上。注意：已經收藏此內容的使用者仍會保有當時的快照。</p>
            <div className="mt-4 flex gap-2">
              <button className="cd-btn-ghost min-w-0 flex-1 py-2" onClick={() => setUnpublishPostId(null)}>取消</button>
              <button className="min-w-0 flex-1 rounded-xl border border-amber-500/35 bg-amber-500/10 py-2 text-[13px] font-bold text-amber-200" onClick={() => { onUnpublishSquare(unpublishPostId); setUnpublishPostId(null); }}>確認撤下</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}