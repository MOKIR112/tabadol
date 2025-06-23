import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Package,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function AdminMediationChannel() {
  const [activeTab, setActiveTab] = useState("disputes");
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch moderation queue
  const { data: moderationQueue = [], isLoading } = useQuery({
    queryKey: ["moderation-queue"],
    queryFn: () => api.admin.getModerationQueue(),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
    }: {
      reportId: string;
      action: "APPROVED" | "REJECTED";
    }) => api.admin.resolveReport(reportId, action, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
      toast({
        title: "Report resolved",
        description: "The report has been processed successfully.",
      });
      setSelectedDispute(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleResolveDispute = (action: "APPROVED" | "REJECTED") => {
    if (!selectedDispute) return;
    resolveReportMutation.mutate({ reportId: selectedDispute.id, action });
  };

  const mockDisputes = [
    {
      id: "1",
      type: "Trade Dispute",
      status: "PENDING",
      priority: "HIGH",
      created_at: "2024-01-16T10:00:00Z",
      reason: "Item condition mismatch",
      participants: [
        {
          id: 1,
          name: "John Smith",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
          role: "Complainant",
        },
        {
          id: 2,
          name: "Sarah Johnson",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
          role: "Respondent",
        },
      ],
      issue: "Item condition mismatch",
      description:
        "The camera I received was not in the condition described. There are scratches on the lens that were not mentioned in the listing.",
      tradeDetails: {
        listing: "Professional Camera Kit",
        offeredItem: "MacBook Pro 2021",
        tradeDate: "2024-01-15",
      },
      messages: [
        {
          id: 1,
          sender: "John Smith",
          message:
            "The camera has visible scratches that weren't mentioned. I feel misled.",
          timestamp: "2024-01-16T10:00:00Z",
        },
        {
          id: 2,
          sender: "Sarah Johnson",
          message:
            "The scratches are minor and don't affect functionality. The camera works perfectly.",
          timestamp: "2024-01-16T10:15:00Z",
        },
      ],
    },
    {
      id: "2",
      type: "User Report",
      status: "PENDING",
      priority: "MEDIUM",
      created_at: "2024-01-16T09:00:00Z",
      reason: "Inappropriate communication",
      participants: [
        {
          id: 3,
          name: "Mike Davis",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
          role: "Reporter",
        },
        {
          id: 4,
          name: "Alex Chen",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
          role: "Reported User",
        },
      ],
      issue: "Inappropriate communication",
      description:
        "User sent inappropriate messages and was rude during negotiations.",
    },
    {
      id: "3",
      type: "Listing Report",
      status: "PENDING",
      priority: "LOW",
      created_at: "2024-01-15T14:30:00Z",
      reason: "Suspicious content",
      participants: [
        {
          id: 5,
          name: "Emma Wilson",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
          role: "Reporter",
        },
      ],
      issue: "Suspicious content",
      description:
        "This listing contains suspicious keywords and might be a scam.",
    },
    {
      id: "4",
      type: "Trade Dispute",
      status: "PENDING",
      priority: "HIGH",
      created_at: "2024-01-14T16:45:00Z",
      reason: "Item not received",
      participants: [
        {
          id: 6,
          name: "David Brown",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
          role: "Complainant",
        },
        {
          id: 7,
          name: "Lisa Garcia",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa",
          role: "Respondent",
        },
      ],
      issue: "Item not received",
      description:
        "I completed my part of the trade but never received the promised item.",
    },
    {
      id: "5",
      type: "User Report",
      status: "PENDING",
      priority: "MEDIUM",
      created_at: "2024-01-13T11:20:00Z",
      reason: "Spam behavior",
      participants: [
        {
          id: 8,
          name: "Tom Anderson",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tom",
          role: "Reporter",
        },
        {
          id: 9,
          name: "Spam User",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=spam",
          role: "Reported User",
        },
      ],
      issue: "Spam behavior",
      description:
        "This user is sending repetitive spam messages to multiple users.",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "RESOLVED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "ESCALATED":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      HIGH: "bg-red-100 text-red-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      LOW: "bg-green-100 text-green-800",
    };
    return (
      <Badge className={colors[priority as keyof typeof colors] || colors.LOW}>
        {priority}
      </Badge>
    );
  };

  const displayDisputes =
    moderationQueue.length > 0 ? moderationQueue : mockDisputes;

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
            Admin Mediation Center
          </h1>
          <p className="text-xl text-muted-foreground">
            Resolve disputes and moderate community issues
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Disputes List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Active Cases</span>
                  <Badge variant="secondary">{displayDisputes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tabadol-purple"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {displayDisputes.map((dispute) => (
                      <div
                        key={dispute.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedDispute?.id === dispute.id
                            ? "bg-purple-50 border-r-2 border-r-purple-500"
                            : ""
                        }`}
                        onClick={() => setSelectedDispute(dispute)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(dispute.status)}
                            <span className="font-medium text-sm">
                              {dispute.type || "Listing Report"}
                            </span>
                          </div>
                          {getPriorityBadge(dispute.priority || "MEDIUM")}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {dispute.issue || dispute.reason}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {dispute.participants?.length || 1} participant(s)
                          </span>
                          <span>
                            {new Date(
                              dispute.created_at || dispute.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Case Details */}
          <div className="lg:col-span-2">
            {selectedDispute ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getStatusIcon(selectedDispute.status)}
                      <span>{selectedDispute.type || "Listing Report"}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(selectedDispute.priority || "MEDIUM")}
                      <Badge variant="outline">
                        Case #{selectedDispute.id}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Issue Description */}
                  <div>
                    <h3 className="font-semibold mb-2">Issue</h3>
                    <p className="text-gray-700">
                      {selectedDispute.description || selectedDispute.reason}
                    </p>
                  </div>

                  {/* Participants */}
                  <div>
                    <h3 className="font-semibold mb-3">Participants</h3>
                    <div className="space-y-3">
                      {(
                        selectedDispute.participants || [
                          {
                            id: selectedDispute.reporter?.id || "unknown",
                            name: selectedDispute.reporter?.name || "Reporter",
                            avatar: selectedDispute.reporter?.avatar,
                            role: "Reporter",
                          },
                        ]
                      ).map((participant, index) => (
                        <div
                          key={participant.id || index}
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback>
                              <User className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{participant.name}</p>
                            <p className="text-sm text-gray-600">
                              {participant.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trade Details */}
                  {selectedDispute.tradeDetails && (
                    <div>
                      <h3 className="font-semibold mb-3">Trade Details</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Listing:</span>
                            <p>{selectedDispute.tradeDetails.listing}</p>
                          </div>
                          <div>
                            <span className="font-medium">Offered Item:</span>
                            <p>{selectedDispute.tradeDetails.offeredItem}</p>
                          </div>
                          <div>
                            <span className="font-medium">Trade Date:</span>
                            <p>
                              {new Date(
                                selectedDispute.tradeDetails.tradeDate,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {selectedDispute.messages && (
                    <div>
                      <h3 className="font-semibold mb-3">Conversation</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {selectedDispute.messages.map((message) => (
                          <div
                            key={message.id}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {message.sender}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  message.timestamp,
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {message.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution */}
                  <div>
                    <h3 className="font-semibold mb-3">Admin Resolution</h3>
                    <Textarea
                      placeholder="Enter your resolution notes..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={4}
                      className="mb-4"
                    />
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleResolveDispute("APPROVED")}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={resolveReportMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve/Resolve
                      </Button>
                      <Button
                        onClick={() => handleResolveDispute("REJECTED")}
                        variant="destructive"
                        disabled={resolveReportMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject/Dismiss
                      </Button>
                      <Button variant="outline">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Parties
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 font-blinker">
                    Select a Case
                  </h3>
                  <p className="text-gray-600">
                    Choose a case from the list to view details and take action
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
