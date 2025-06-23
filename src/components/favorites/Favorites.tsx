import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Search,
  MapPin,
  Calendar,
  MessageCircle,
  Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function Favorites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categories = [
    "All Categories",
    "Electronics",
    "Furniture",
    "Clothing",
    "Books",
    "Sports",
    "Music",
    "Art",
  ];

  // Fetch user's favorites
  const {
    data: favorites = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await api.favorites.getByUserId(user.id);
      } catch (error) {
        console.error("Error fetching favorites:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1,
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (listingId: string) =>
      api.favorites.remove(user!.id, listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: "Removed from favorites",
        description: "The listing has been removed from your favorites.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFavorite = (listingId: string) => {
    removeFavoriteMutation.mutate(listingId);
  };

  // Filter favorites based on search and category
  const filteredFavorites = favorites.filter((favorite) => {
    const listing = favorite.listing;
    if (!listing) return false;

    const matchesSearch =
      !searchQuery ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      listing.category.toLowerCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const mockFavorites = [
    {
      id: 1,
      title: "Professional Camera Kit",
      description: "Canon EOS R5 with multiple lenses and accessories",
      image:
        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80",
      category: "Electronics",
      location: "San Francisco, CA",
      wantedItems: ["Laptop", "Drone"],
      postedDate: "2024-01-15",
      savedDate: "2024-01-16",
      user: {
        name: "John Smith",
        rating: 4.8,
      },
      isAvailable: true,
    },
    {
      id: 2,
      title: "Vintage Guitar Collection",
      description: "3 acoustic guitars in excellent condition",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
      category: "Music",
      location: "Austin, TX",
      wantedItems: ["Amplifier", "Recording Equipment"],
      postedDate: "2024-01-10",
      savedDate: "2024-01-12",
      user: {
        name: "Sarah Johnson",
        rating: 4.9,
      },
      isAvailable: true,
    },
    {
      id: 3,
      title: "Designer Furniture Set",
      description: "Modern living room set in excellent condition",
      image:
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
      category: "Furniture",
      location: "New York, NY",
      wantedItems: ["Art Pieces", "Kitchen Appliances"],
      postedDate: "2024-01-05",
      savedDate: "2024-01-08",
      user: {
        name: "Emma Wilson",
        rating: 5.0,
      },
      isAvailable: false,
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
            My Favorites
          </h1>
          <p className="text-xl text-muted-foreground">
            Items you've saved for later
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category, index) => (
                  <SelectItem
                    key={index}
                    value={index === 0 ? "all" : category.toLowerCase()}
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-600 mb-4">Failed to load favorites</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Favorites Grid */}
        {!isLoading &&
          !error &&
          (filteredFavorites.length > 0 || mockFavorites.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {(filteredFavorites.length > 0
                ? filteredFavorites
                : mockFavorites
              ).map((favorite) => {
                const listing = favorite.listing || favorite;
                return (
                  <Card
                    key={listing.id}
                    className="card-hover cursor-pointer group relative"
                  >
                    <Link to={`/listing/${listing.id}`}>
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img
                          src={listing.images?.[0] || listing.image}
                          alt={listing.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800">
                          {listing.category}
                        </Badge>
                        {listing.status !== "ACTIVE" && (
                          <Badge className="absolute top-3 right-12 bg-red-500 text-white">
                            Unavailable
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-2 font-blinker">
                          {listing.title}
                        </h3>
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {listing.description}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <MapPin className="w-4 h-4 mr-1" />
                          {listing.location}
                        </div>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm font-medium text-gray-700">
                            Looking for:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(
                              listing.wanted_items ||
                              listing.wantedItems ||
                              []
                            ).map((item, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
                          <span>
                            {listing.user?.name || "Unknown"} • ★{" "}
                            {listing.user?.rating || "N/A"}
                          </span>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Saved{" "}
                            {favorite.created_at
                              ? new Date(
                                  favorite.created_at,
                                ).toLocaleDateString()
                              : new Date(
                                  favorite.savedDate || Date.now(),
                                ).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white text-red-500"
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(listing.id);
                      }}
                      disabled={removeFavoriteMutation.isPending}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Heart className="w-16 h-16 mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold mb-2 font-blinker">
                  No favorites yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start browsing listings and save items you're interested in
                </p>
                <Button className="btn-gradient" asChild>
                  <Link to="/listings">Browse Listings</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
