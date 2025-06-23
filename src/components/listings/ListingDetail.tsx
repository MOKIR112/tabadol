import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MapPin,
  Calendar,
  Star,
  MessageCircle,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch listing data
  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listings.getById(id!),
    enabled: !!id,
  });

  // Increment view count
  useEffect(() => {
    if (listing && id) {
      api.listings.incrementViews(id);
    }
  }, [listing, id]);

  // Check if favorited
  useEffect(() => {
    if (user && listing) {
      api.favorites.getByUserId(user.id).then((favorites) => {
        setIsFavorited(favorites.some((f) => f.listing_id === listing.id));
      });
    }
  }, [user, listing]);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("User or listing not found");

      if (isFavorited) {
        await api.favorites.remove(user.id, listing.id);
      } else {
        await api.favorites.add(user.id, listing.id);
      }
    },
    onSuccess: () => {
      setIsFavorited(!isFavorited);
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited
          ? "The listing has been removed from your favorites."
          : "The listing has been saved to your favorites.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save favorites.",
        variant: "destructive",
      });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handleSendMessage = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to send messages.",
        variant: "destructive",
      });
      return;
    }
    navigate("/inbox");
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">Listing not found</h3>
            <p className="text-gray-600 mb-6">
              The listing you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/listings")}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data fallback for demo
  const mockListing = {
    id: 1,
    title: "Professional Camera Kit",
    description:
      "Canon EOS R5 with multiple lenses and accessories. This is a complete professional photography setup that I've used for wedding photography for the past 2 years. Everything is in excellent condition and well-maintained. Includes camera body, 24-70mm f/2.8 lens, 70-200mm f/2.8 lens, 50mm f/1.4 lens, battery grip, extra batteries, memory cards, and a professional camera bag.",
    images: [
      "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
    ],
    category: "Electronics",
    location: "San Francisco, CA",
    wantedItems: ["MacBook Pro", "Drone", "Video Equipment"],
    postedDate: "2024-01-15",
    condition: "Excellent",
    user: {
      id: 1,
      name: "John Smith",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      rating: 4.8,
      totalTrades: 23,
      joinedDate: "2023-06-15",
      verifiedEmail: true,
      verifiedPhone: true,
    },
  };

  // Use real data if available, otherwise fallback to mock
  const displayListing = listing || mockListing;
  const images =
    displayListing.images || [displayListing.image].filter(Boolean);

  const relatedListings = [
    {
      id: 2,
      title: "DSLR Camera Bundle",
      image:
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80",
      location: "Oakland, CA",
    },
    {
      id: 3,
      title: "Photography Lighting Kit",
      image:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80",
      location: "San Jose, CA",
    },
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link to="/listings">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={
                      images[currentImageIndex] ||
                      displayListing.image ||
                      "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80"
                    }
                    alt={displayListing.title}
                    className="w-full h-96 object-cover rounded-t-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80";
                    }}
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentImageIndex
                            ? "bg-white"
                            : "bg-white/50"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
                {images.length > 1 && (
                  <div className="p-4 flex space-x-2 overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex
                            ? "border-tabadol-purple"
                            : "border-gray-200"
                        }`}
                      >
                        <img
                          src={
                            image ||
                            "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80"
                          }
                          alt={`${displayListing.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listing Details */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 font-blinker">
                      {displayListing.title}
                    </h1>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {displayListing.location}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Posted{" "}
                        {displayListing.created_at
                          ? new Date(
                              displayListing.created_at,
                            ).toLocaleDateString()
                          : new Date(
                              displayListing.postedDate,
                            ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleFavorite}
                      className={isFavorited ? "text-red-500" : ""}
                      disabled={toggleFavoriteMutation.isPending}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge>{displayListing.category}</Badge>
                  <Badge variant="secondary">
                    Condition: {displayListing.condition}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 font-blinker">
                      Description
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {displayListing.description}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-3 font-blinker">
                      Looking for in exchange:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(
                        displayListing.wanted_items ||
                        displayListing.wantedItems ||
                        []
                      ).map((item, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-sm"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={displayListing.user?.avatar} />
                    <AvatarFallback>
                      {displayListing.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg font-blinker">
                      {displayListing.user?.name || "Unknown User"}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{displayListing.user?.rating || "N/A"}</span>
                      <span>•</span>
                      <span>
                        {displayListing.user?.totalTrades || 0} trades
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <p>
                    Joined{" "}
                    {displayListing.user?.created_at
                      ? new Date(
                          displayListing.user.created_at,
                        ).toLocaleDateString()
                      : new Date(
                          displayListing.user?.joinedDate || Date.now(),
                        ).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-4">
                    {displayListing.user?.email_verified && (
                      <span className="text-green-600">✓ Email verified</span>
                    )}
                    {displayListing.user?.phone_verified && (
                      <span className="text-green-600">✓ Phone verified</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full btn-gradient"
                    onClick={handleSendMessage}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/profile/${displayListing.user?.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Related Listings */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 font-blinker">
                  Similar Listings
                </h3>
                <div className="space-y-4">
                  {relatedListings.map((item) => (
                    <Link
                      key={item.id}
                      to={`/listing/${item.id}`}
                      className="flex space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {item.location}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
