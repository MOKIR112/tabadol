import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function MyListings() {
  const [activeTab, setActiveTab] = useState("active");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's listings
  const {
    data: userListings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-listings", user?.id],
    queryFn: () => api.listings.getByUserId(user!.id),
    enabled: !!user,
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) => api.listings.delete(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({
        title: "Listing deleted",
        description: "Your listing has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteListing = (listingId: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      deleteListingMutation.mutate(listingId);
    }
  };

  // Categorize listings
  const categorizedListings = {
    active: userListings.filter((listing) => listing.status === "ACTIVE"),
    completed: userListings.filter((listing) => listing.status === "COMPLETED"),
    draft: userListings.filter((listing) => listing.status === "DRAFT"),
  };

  const mockListings = {
    active: [
      {
        id: 1,
        title: "Professional Camera Kit",
        description: "Canon EOS R5 with multiple lenses",
        image:
          "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80",
        category: "Electronics",
        location: "San Francisco, CA",
        postedDate: "2024-01-15",
        views: 45,
        messages: 8,
        status: "active",
      },
      {
        id: 2,
        title: "Vintage Guitar Collection",
        description: "3 acoustic guitars in excellent condition",
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
        category: "Music",
        location: "San Francisco, CA",
        postedDate: "2024-01-10",
        views: 32,
        messages: 5,
        status: "active",
      },
    ],
    completed: [
      {
        id: 3,
        title: "Home Gym Equipment",
        description: "Complete weight set with bench",
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
        category: "Sports",
        location: "San Francisco, CA",
        postedDate: "2023-12-20",
        completedDate: "2024-01-05",
        tradedWith: "Mike Davis",
        views: 67,
        messages: 12,
        status: "completed",
      },
    ],
    draft: [
      {
        id: 4,
        title: "Art Supply Collection",
        description: "Professional painting supplies",
        image:
          "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80",
        category: "Art",
        location: "San Francisco, CA",
        postedDate: "2024-01-16",
        views: 0,
        messages: 0,
        status: "draft",
      },
    ],
  };

  const ListingCard = ({ listing }: { listing: any }) => (
    <Card className="card-hover">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-32 h-32 flex-shrink-0">
            <img
              src={listing.image}
              alt={listing.title}
              className="w-full h-full object-cover rounded-l-lg"
            />
          </div>
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1 font-blinker">
                  {listing.title}
                </h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {listing.description}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {listing.location}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {listing.created_at
                      ? new Date(listing.created_at).toLocaleDateString()
                      : new Date(listing.postedDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge>{listing.category}</Badge>
                  {listing.status === "completed" && (
                    <Badge variant="secondary">Completed</Badge>
                  )}
                  {listing.status === "draft" && (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/listing/${listing.id}`}
                      className="flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Listing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/edit-listing/${listing.id}`}
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  {listing.status !== "completed" &&
                    listing.status !== "COMPLETED" && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteListing(listing.id)}
                        className="flex items-center text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div className="flex space-x-4">
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {listing.views || 0} views
                </span>
                <span className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {listing._count?.messages || listing.messages || 0} messages
                </span>
              </div>
              {listing.status === "completed" && listing.tradedWith && (
                <span className="text-green-600">
                  Traded with {listing.tradedWith}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
              My Listings
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage your trade listings
            </p>
          </div>
          <Button className="btn-gradient" asChild>
            <Link to="/create-listing">
              <Plus className="w-4 h-4 mr-2" />
              Create Listing
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="active">
              Active (
              {categorizedListings.active.length || mockListings.active.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed (
              {categorizedListings.completed.length ||
                mockListings.completed.length}
              )
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts (
              {categorizedListings.draft.length || mockListings.draft.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
              </div>
            ) : error ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-red-600 mb-4">Failed to load listings</p>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : categorizedListings.active.length > 0 ||
              mockListings.active.length > 0 ? (
              (categorizedListings.active.length > 0
                ? categorizedListings.active
                : mockListings.active
              ).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Plus className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 font-blinker">
                    No active listings
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create your first listing to start trading
                  </p>
                  <Button className="btn-gradient" asChild>
                    <Link to="/create-listing">Create Your First Listing</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {categorizedListings.completed.length > 0 ||
            mockListings.completed.length > 0 ? (
              (categorizedListings.completed.length > 0
                ? categorizedListings.completed
                : mockListings.completed
              ).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 font-blinker">
                    No completed trades yet
                  </h3>
                  <p className="text-gray-600">
                    Your completed trades will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            {categorizedListings.draft.length > 0 ||
            mockListings.draft.length > 0 ? (
              (categorizedListings.draft.length > 0
                ? categorizedListings.draft
                : mockListings.draft
              ).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Edit className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 font-blinker">
                    No draft listings
                  </h3>
                  <p className="text-gray-600">
                    Save listings as drafts to finish them later
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
