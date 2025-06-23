import { useState, useEffect } from "react";
import { useRealtimeMessages } from "@/hooks/useRealtime";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  MessageCircle,
  Send,
  Image,
  Paperclip,
  MoreVertical,
  Star,
  Flag,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState<
    number | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await api.messages.getConversations(user.id);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    retry: 1,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConversation, user?.id],
    queryFn: async () => {
      if (!selectedConversation || !user) return [];
      const conv = conversations.find((c) => c.id === selectedConversation);
      if (!conv) return [];
      try {
        return await api.messages.getConversation(
          user.id,
          conv.sender_id === user.id ? conv.receiver_id : conv.sender_id,
          conv.listing_id,
        );
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    enabled: !!selectedConversation && !!user && conversations.length > 0,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time chat
    retry: 1,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: {
      receiverId: string;
      content: string;
      listingId?: string;
    }) =>
      api.messages.send({
        senderId: user!.id,
        receiverId: messageData.receiverId,
        content: messageData.content,
        listingId: messageData.listingId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const mockConversations = [
    {
      id: 1,
      user: {
        id: 1,
        name: "Sarah Johnson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        rating: 4.9,
      },
      listing: {
        id: 2,
        title: "Vintage Guitar Collection",
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&q=80",
      },
      lastMessage:
        "That sounds like a great trade! When would you like to meet?",
      timestamp: "2024-01-16T10:30:00Z",
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: 2,
      user: {
        id: 2,
        name: "Mike Davis",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
        rating: 4.7,
      },
      listing: {
        id: 3,
        title: "Home Gym Equipment",
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&q=80",
      },
      lastMessage: "I'm interested in your camera kit. Is it still available?",
      timestamp: "2024-01-15T14:20:00Z",
      unreadCount: 0,
      isOnline: false,
    },
  ];

  const mockMessages = [
    {
      id: 1,
      senderId: 1,
      senderName: "Sarah Johnson",
      message:
        "Hi! I'm interested in your camera kit. Would you be willing to trade for my guitar collection?",
      timestamp: "2024-01-16T09:00:00Z",
      isCurrentUser: false,
    },
    {
      id: 2,
      senderId: 0,
      senderName: "You",
      message:
        "Hi Sarah! Yes, I'd definitely be interested. Your guitars look amazing. Can you tell me more about their condition?",
      timestamp: "2024-01-16T09:15:00Z",
      isCurrentUser: true,
    },
    {
      id: 3,
      senderId: 1,
      senderName: "Sarah Johnson",
      message:
        "They're all in excellent condition. I've been the only owner and they've been well-maintained. Would you like to see them in person?",
      timestamp: "2024-01-16T09:30:00Z",
      isCurrentUser: false,
    },
    {
      id: 4,
      senderId: 0,
      senderName: "You",
      message:
        "That sounds perfect! I'm available this weekend if that works for you.",
      timestamp: "2024-01-16T10:00:00Z",
      isCurrentUser: true,
    },
    {
      id: 5,
      senderId: 1,
      senderName: "Sarah Johnson",
      message: "That sounds like a great trade! When would you like to meet?",
      timestamp: "2024-01-16T10:30:00Z",
      isCurrentUser: false,
    },
  ];

  const displayConversations =
    conversations.length > 0 ? conversations : mockConversations;
  const displayMessages = messages.length > 0 ? messages : mockMessages;
  const selectedConv = displayConversations.find(
    (c) => c.id === selectedConversation,
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (messageInput.trim() || selectedFiles.length > 0) &&
      selectedConv &&
      user
    ) {
      const receiverId =
        selectedConv.sender?.id === user.id
          ? selectedConv.receiver?.id
          : selectedConv.sender?.id;

      if (receiverId) {
        sendMessageMutation.mutate({
          receiverId,
          content:
            messageInput.trim() ||
            (selectedFiles.length > 0 ? "📎 Attachment" : ""),
          listingId: selectedConv.listing?.id,
          attachments: selectedFiles,
        });
        setSelectedFiles([]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf";
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const isValidType =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf";
      const isValidSize = file.size <= 10 * 1024 * 1024;
      return isValidType && isValidSize;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const handleBlockUser = async (userId: string) => {
    if (!user || !userId) return;

    try {
      await api.moderation.blockUser(user.id, userId);
      toast({
        title: "User blocked",
        description: "You will no longer receive messages from this user.",
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReportUser = async (userId: string) => {
    if (!user || !userId) return;

    const reason = prompt("Please provide a reason for reporting this user:");
    if (!reason) return;

    try {
      await api.moderation.reportUser(user.id, userId, reason);
      toast({
        title: "User reported",
        description: "Thank you for your report. We will review it shortly.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to report user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversation && displayConversations.length > 0) {
      setSelectedConversation(displayConversations[0].id);
    }
  }, [displayConversations, selectedConversation]);

  // Real-time messaging
  useRealtimeMessages(
    selectedConversation?.toString() || null,
    user?.id || null,
  );

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    window.addEventListener("newMessage", handleNewMessage as EventListener);
    return () =>
      window.removeEventListener(
        "newMessage",
        handleNewMessage as EventListener,
      );
  }, [queryClient]);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
            Messages
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect with other traders
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-600 mb-4">Failed to load conversations</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
            {/* Conversations List */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardContent className="p-0">
                  {/* Search */}
                  <div className="p-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Conversations */}
                  <div className="overflow-y-auto h-[500px]">
                    {displayConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedConversation === conversation.id
                            ? "bg-tabadol-purple/5 border-r-2 border-r-tabadol-purple"
                            : ""
                        }`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage
                                src={
                                  conversation.user?.avatar ||
                                  conversation.sender?.avatar
                                }
                              />
                              <AvatarFallback>
                                {(
                                  conversation.user?.name ||
                                  conversation.sender?.name ||
                                  "U"
                                ).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-sm truncate">
                                {conversation.user?.name ||
                                  conversation.sender?.name ||
                                  "Unknown User"}
                              </h3>
                              <div className="flex items-center space-x-1">
                                {conversation.unreadCount > 0 && (
                                  <Badge className="bg-tabadol-purple text-white text-xs px-2 py-1">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  {formatDate(
                                    conversation.timestamp ||
                                      conversation.created_at,
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-600">
                                {conversation.user?.rating ||
                                  conversation.sender?.rating ||
                                  "N/A"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {conversation.lastMessage || conversation.content}
                            </p>
                            <div className="flex items-center space-x-2">
                              <img
                                src={
                                  conversation.listing?.image ||
                                  conversation.listing?.images?.[0] ||
                                  "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=100&q=80"
                                }
                                alt={conversation.listing?.title || "Listing"}
                                className="w-6 h-6 rounded object-cover"
                              />
                              <span className="text-xs text-gray-500 truncate">
                                {conversation.listing?.title ||
                                  "Unknown Listing"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedConv ? (
                <Card className="h-full flex flex-col">
                  {/* Chat Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={
                            selectedConv.user?.avatar ||
                            selectedConv.sender?.avatar
                          }
                        />
                        <AvatarFallback>
                          {(
                            selectedConv.user?.name ||
                            selectedConv.sender?.name ||
                            "U"
                          ).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {selectedConv.user?.name ||
                            selectedConv.sender?.name ||
                            "Unknown User"}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>
                            {selectedConv.user?.rating ||
                              selectedConv.sender?.rating ||
                              "N/A"}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              selectedConv.isOnline
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            {selectedConv.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/listing/${selectedConv.listing?.id}`}>
                          View Listing
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleBlockUser(
                                selectedConv.sender?.id ||
                                  selectedConv.user?.id,
                              )
                            }
                            className="text-red-600"
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Block User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleReportUser(
                                selectedConv.sender?.id ||
                                  selectedConv.user?.id,
                              )
                            }
                            className="text-red-600"
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Report User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    className={`flex-1 overflow-y-auto p-4 space-y-4 ${
                      isDragging
                        ? "bg-blue-50 border-2 border-dashed border-blue-300"
                        : ""
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {displayMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user?.id || message.isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === user?.id ||
                            message.isCurrentUser
                              ? "bg-tabadol-purple text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">
                            {message.content || message.message}
                          </p>

                          {/* Message Attachments */}
                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment: any) => (
                                  <div
                                    key={attachment.id}
                                    className="border rounded p-2"
                                  >
                                    {attachment.file_type.startsWith(
                                      "image/",
                                    ) ? (
                                      <img
                                        src={attachment.file_url}
                                        alt={attachment.file_name}
                                        className="max-w-full h-auto rounded cursor-pointer"
                                        onClick={() =>
                                          window.open(
                                            attachment.file_url,
                                            "_blank",
                                          )
                                        }
                                      />
                                    ) : (
                                      <a
                                        href={attachment.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 text-blue-600 hover:underline"
                                      >
                                        <Paperclip className="w-4 h-4" />
                                        <span className="text-sm">
                                          {attachment.file_name}
                                        </span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          <p
                            className={`text-xs mt-1 ${
                              message.sender_id === user?.id ||
                              message.isCurrentUser
                                ? "text-white/70"
                                : "text-gray-500"
                            }`}
                          >
                            {formatTime(
                              message.created_at || message.timestamp,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isDragging && (
                      <div className="text-center text-blue-600 font-medium">
                        Drop files here to send
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    {/* File Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 bg-white px-3 py-2 rounded border"
                            >
                              <span className="text-sm truncate max-w-32">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={handleSendMessage}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="file"
                        id="file-input"
                        multiple
                        accept="image/*,video/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          document.getElementById("file-input")?.click()
                        }
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById(
                            "file-input",
                          ) as HTMLInputElement;
                          if (input) {
                            input.accept = "image/*";
                            input.click();
                          }
                        }}
                      >
                        <Image className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="flex-1"
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="submit"
                        className="btn-gradient"
                        disabled={
                          sendMessageMutation.isPending ||
                          (!messageInput.trim() && selectedFiles.length === 0)
                        }
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 font-blinker">
                      Select a conversation
                    </h3>
                    <p className="text-gray-600">
                      Choose a conversation from the list to start chatting
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
