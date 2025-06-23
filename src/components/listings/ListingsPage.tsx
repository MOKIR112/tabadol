import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Heart,
  MapPin,
  Grid3X3,
  List,
  SlidersHorizontal,
  Star,
  Eye,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function ListingsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [condition, setCondition] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const categories = [
    "All Categories",
    "Dresses",
    "Tops & Blouses",
    "Pants & Jeans",
    "Shoes",
    "Accessories",
    "Bags",
    "Jewelry",
    "Outerwear",
    "Activewear",
    "Vintage",
    "Designer",
  ];

  const locations = [
    "All Locations",
    "Nearby (10km)",
    "New York, NY",
    "Los Angeles, CA",
    "Chicago, IL",
    "Miami, FL",
    "San Francisco, CA",
    "Austin, TX",
    "Seattle, WA",
    "Boston, MA",
    "Denver, CO",
  ];

  // Add radius selector for nearby option
  const radiusOptions = [5, 10, 25, 50, 100];

  const sizes = [
    "All Sizes",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "One Size",
  ];

  const brands = [
    "All Brands",
    "Chanel",
    "Gucci",
    "Prada",
    "Louis Vuitton",
    "Hermès",
    "Dior",
    "Versace",
    "Balenciaga",
    "Saint Laurent",
    "Bottega Veneta",
  ];

  // Debounce search query and generate suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery.length > 2) {
        generateSearchSuggestions(searchQuery);
      } else {
        setSearchSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const generateSearchSuggestions = (query: string) => {
    const suggestions = [
      ...popularSearches.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase()),
      ),
      ...searchHistory.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase()),
      ),
      `${query} in ${selectedLocation !== "all" ? selectedLocation : "your area"}`,
      `${query} under $100`,
      `${query} designer`,
      `${query} vintage`,
    ].slice(0, 6);
    setSearchSuggestions(suggestions);
  };

  const handleSearchSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    if (!searchHistory.includes(suggestion)) {
      setSearchHistory((prev) => [suggestion, ...prev.slice(0, 9)]);
    }
  };

  const saveCurrentSearch = () => {
    const searchConfig = {
      query: searchQuery,
      category: selectedCategory,
      location: selectedLocation,
      priceRange,
      condition,
      timestamp: new Date().toISOString(),
    };
    // In real app, save to user preferences
    toast({
      title: "Search saved",
      description: "You'll be notified when new matching items are listed.",
    });
  };

  // Get user location for radius filtering
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [showMap, setShowMap] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularSearches] = useState([
    "Designer bags",
    "Vintage clothing",
    "Electronics",
    "Books",
    "Jewelry",
  ]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.log("Location access denied"),
      );
    }
  }, []);

  // Fetch listings from API
  const {
    data: listings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "listings",
      debouncedSearch,
      selectedCategory,
      selectedLocation,
      selectedSize,
      selectedBrand,
      sortBy,
      userLocation,
      radiusKm,
    ],
    queryFn: async () => {
      if (userLocation && selectedLocation === "nearby") {
        return api.location.getListingsWithinRadius(
          userLocation.lat,
          userLocation.lng,
          radiusKm,
        );
      }

      return api.listings.getAll({
        search: debouncedSearch || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        location: selectedLocation !== "all" ? selectedLocation : undefined,
        size: selectedSize !== "all" ? selectedSize : undefined,
        brand: selectedBrand !== "all" ? selectedBrand : undefined,
        sortBy: sortBy,
        limit: 24,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleToggleFavorite = async (listingId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save favorites.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if already favorited
      const favorites = await api.favorites.getByUserId(user.id);
      const isFavorited = favorites.some((f) => f.listing_id === listingId);

      if (isFavorited) {
        await api.favorites.remove(user.id, listingId);
        toast({
          title: "Removed from favorites",
          description: "The listing has been removed from your favorites.",
        });
      } else {
        await api.favorites.add(user.id, listingId);
        toast({
          title: "Added to favorites",
          description: "The listing has been saved to your favorites.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  const mockListings = [
    {
      id: "1",
      title: "Vintage Chanel Blazer",
      description:
        "Authentic vintage Chanel blazer in excellent condition. Perfect for professional or casual wear. This timeless piece features the classic Chanel silhouette with gold-tone buttons.",
      image:
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&q=80",
      category: "Outerwear",
      location: "New York, NY",
      price: "450",
      originalPrice: "2800",
      size: "M",
      brand: "Chanel",
      condition: "Excellent",
      wantedItems: ["Designer Handbag", "Jewelry", "Silk Scarves"],
      postedDate: "2 days ago",
      views: 124,
      likes: 23,
      isNew: false,
      isTrending: true,
      user: {
        name: "Sophie Chen",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophie",
        rating: 4.9,
        trades: 45,
        verified: true,
      },
    },
    {
      id: "2",
      title: "Reformation Midi Dress",
      description:
        "Beautiful floral midi dress from Reformation. Worn only once to a wedding. Features a flattering wrap silhouette and sustainable fabric.",
      image:
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80",
      category: "Dresses",
      location: "Los Angeles, CA",
      price: "120",
      originalPrice: "248",
      size: "S",
      brand: "Reformation",
      condition: "Like New",
      wantedItems: ["Casual Tops", "Denim", "Summer Dresses"],
      postedDate: "1 day ago",
      views: 89,
      likes: 34,
      isNew: true,
      isTrending: false,
      user: {
        name: "Emma Rodriguez",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
        rating: 4.8,
        trades: 28,
        verified: true,
      },
    },
    {
      id: "3",
      title: "Louboutin Red Sole Heels",
      description:
        "Classic Christian Louboutin black pumps with signature red sole. Size 38. Minimal wear, professionally maintained. Comes with dust bag.",
      image:
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80",
      category: "Shoes",
      location: "Miami, FL",
      price: "380",
      originalPrice: "695",
      size: "38",
      brand: "Christian Louboutin",
      condition: "Good",
      wantedItems: ["Designer Shoes", "Accessories", "Evening Wear"],
      postedDate: "3 days ago",
      views: 156,
      likes: 67,
      isNew: false,
      isTrending: true,
      user: {
        name: "Isabella Martinez",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=isabella",
        rating: 5.0,
        trades: 72,
        verified: true,
      },
    },
    {
      id: "4",
      title: "Hermès Silk Scarf",
      description:
        "Authentic Hermès silk scarf in pristine condition. Classic pattern in beautiful colors. A timeless accessory that elevates any outfit.",
      image:
        "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&q=80",
      category: "Accessories",
      location: "San Francisco, CA",
      price: "180",
      originalPrice: "395",
      size: "One Size",
      brand: "Hermès",
      condition: "Excellent",
      wantedItems: ["Vintage Jewelry", "Silk Items", "Designer Accessories"],
      postedDate: "5 days ago",
      views: 203,
      likes: 45,
      isNew: false,
      isTrending: false,
      user: {
        name: "Grace Kim",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=grace",
        rating: 4.7,
        trades: 31,
        verified: false,
      },
    },
    {
      id: "5",
      title: "Levi's Vintage 501 Jeans",
      description:
        "Authentic vintage Levi's 501 jeans in perfect faded wash. True vintage piece from the 90s. Perfect fit and authentic vintage character.",
      image:
        "https://images.unsplash.com/photo-1542272604-787c38355dd2?w=400&q=80",
      category: "Pants & Jeans",
      location: "Austin, TX",
      price: "85",
      originalPrice: "150",
      size: "30x32",
      brand: "Levi's",
      condition: "Very Good",
      wantedItems: ["Vintage Tees", "Sneakers", "Denim Jackets"],
      postedDate: "1 week ago",
      views: 78,
      likes: 19,
      isNew: false,
      isTrending: false,
      user: {
        name: "Alex Thompson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        rating: 4.6,
        trades: 15,
        verified: true,
      },
    },
    {
      id: "6",
      title: "Gucci Marmont Bag",
      description:
        "Authentic Gucci GG Marmont matelassé shoulder bag in black leather with gold hardware. Excellent condition with minimal signs of wear.",
      image:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80",
      category: "Bags",
      location: "Chicago, IL",
      price: "890",
      originalPrice: "1980",
      size: "Medium",
      brand: "Gucci",
      condition: "Excellent",
      wantedItems: [
        "Designer Clothing",
        "Luxury Accessories",
        "Designer Shoes",
      ],
      postedDate: "4 days ago",
      views: 267,
      likes: 89,
      isNew: false,
      isTrending: true,
      user: {
        name: "Olivia Johnson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=olivia",
        rating: 4.9,
        trades: 56,
        verified: true,
      },
    },
  ];

  const activeListings = listings.length > 0 ? listings : mockListings;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Enhanced Hero Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-tabadol-purple" />
              <span className="text-tabadol-purple font-medium">
                Premium Fashion Marketplace
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 font-blinker">
              Discover Fashion
              <span className="gradient-text block mt-2">Treasures</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Trade, sell, and discover pre-loved designer pieces from fashion
              lovers worldwide.
              <br className="hidden md:block" />
              Every item tells a story, every trade creates a connection.
            </p>

            {/* Enhanced Search Bar with Autocomplete */}
            <div className="relative max-w-3xl mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-tabadol-purple to-tabadol-orange rounded-2xl blur opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-xl border-2 border-gray-100">
                <Search className="absolute left-6 top-6 h-6 w-6 text-gray-400" />
                <Input
                  placeholder="Search for brands, items, styles, or colors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  className="pl-16 pr-20 py-6 text-lg rounded-2xl border-0 focus:ring-2 focus:ring-tabadol-purple/20 bg-transparent"
                />
                <Button
                  onClick={saveCurrentSearch}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 rounded-xl"
                >
                  <Heart className="w-4 h-4" />
                </Button>

                {/* Search Suggestions Dropdown */}
                {showSuggestions &&
                  (searchSuggestions.length > 0 ||
                    popularSearches.length > 0) && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl mt-2 z-50 max-h-80 overflow-y-auto">
                      {searchQuery.length > 0 &&
                        searchSuggestions.length > 0 && (
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-600 mb-2">
                              Suggestions
                            </h4>
                            {searchSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleSearchSelect(suggestion)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm"
                              >
                                <Search className="w-4 h-4 inline mr-2 text-gray-400" />
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      {searchQuery.length === 0 && (
                        <div className="p-4">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">
                            Popular Searches
                          </h4>
                          {popularSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => handleSearchSelect(search)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm"
                            >
                              <TrendingUp className="w-4 h-4 inline mr-2 text-gray-400" />
                              {search}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Quick Filter Tags */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Designer",
                "Vintage",
                "New Arrivals",
                "Under $100",
                "Trending",
              ].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  className="rounded-full px-6 py-2 border-2 hover:border-tabadol-purple hover:text-tabadol-purple transition-all duration-300"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Filters */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col space-y-6">
            {/* Primary Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-tabadol-purple" />
                <span className="font-semibold text-gray-700">Filters:</span>
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-52 rounded-full border-2 hover:border-tabadol-purple transition-colors">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category, index) => (
                    <SelectItem
                      key={index}
                      value={
                        index === 0
                          ? "all"
                          : category
                              .toLowerCase()
                              .replace(" & ", "-")
                              .replace(" ", "-")
                      }
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger className="w-52 rounded-full border-2 hover:border-tabadol-purple transition-colors">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location, index) => (
                    <SelectItem
                      key={index}
                      value={
                        index === 0
                          ? "all"
                          : location
                              .toLowerCase()
                              .replace(", ", "-")
                              .replace(" ", "-")
                      }
                    >
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger className="w-36 rounded-full border-2 hover:border-tabadol-purple transition-colors">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size, index) => (
                    <SelectItem
                      key={index}
                      value={index === 0 ? "all" : size.toLowerCase()}
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-48 rounded-full border-2 hover:border-tabadol-purple transition-colors">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand, index) => (
                    <SelectItem
                      key={index}
                      value={
                        index === 0
                          ? "all"
                          : brand.toLowerCase().replace(" ", "-")
                      }
                    >
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="rounded-full flex items-center gap-2 border-2 hover:border-tabadol-purple hover:text-tabadol-purple transition-all duration-300"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {showAdvancedFilters ? "Hide" : "More"} Filters
                </Button>

                <div className="text-sm text-gray-500">
                  {activeListings.length} items found
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-52 rounded-full border-2">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-low">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-high">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="trending">Trending</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 border-2 rounded-full p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-full"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-full"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([parseInt(e.target.value), priceRange[1]])
                      }
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value)])
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition
                  </label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue placeholder="Any Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Condition</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="like-new">Like New</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedLocation === "nearby" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Radius: {radiusKm}km
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5km</span>
                      <span>100km</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map View */}
          {showMap && (
            <div className="mt-6 h-96 bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Interactive Map
                </h3>
                <p className="text-gray-500">
                  Map integration would be implemented here
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Showing listings within {radiusKm}km radius
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Results Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold font-blinker mb-2">
              {activeListings.length} Fashion Items
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Curated pieces from verified sellers worldwide
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              Updated 2 min ago
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200"></div>
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-tabadol-purple border-t-transparent absolute top-0"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="rounded-3xl border-red-200 bg-red-50">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-2">
                Failed to load listings
              </h3>
              <p className="text-red-600 mb-6">
                We're having trouble connecting to our servers.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="btn-gradient rounded-full px-8"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && activeListings.length === 0 && (
          <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-3xl font-bold mb-4 font-blinker">
                No items found
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                Try adjusting your filters or search terms to discover amazing
                fashion pieces waiting for their next owner.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="btn-gradient rounded-full px-8 py-3" asChild>
                  <Link to="/create-listing">List Your Items</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full px-8 py-3 border-2"
                  asChild
                >
                  <Link to="/">Browse All Categories</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Listings Grid */}
        {!isLoading && !error && activeListings.length > 0 && (
          <div
            className={`grid gap-8 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 max-w-5xl mx-auto"
            }`}
          >
            {activeListings.map((listing) => (
              <Card
                key={listing.id}
                className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 rounded-3xl overflow-hidden border-0 shadow-lg bg-white ${
                  viewMode === "list" ? "flex" : ""
                }`}
              >
                <Link to={`/listing/${listing.id}`} className="block">
                  <div
                    className={`relative overflow-hidden ${
                      viewMode === "list"
                        ? "w-64 flex-shrink-0"
                        : "aspect-[3/4]"
                    }`}
                  >
                    <img
                      src={
                        listing.image ||
                        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80"
                      }
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80";
                      }}
                    />

                    {/* Enhanced Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                    {/* Top badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {listing.isNew && (
                        <Badge className="bg-green-500 text-white font-medium rounded-full px-3 py-1 shadow-lg">
                          <Sparkles className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                      )}
                      {listing.isTrending && (
                        <Badge className="bg-orange-500 text-white font-medium rounded-full px-3 py-1 shadow-lg">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Trending
                        </Badge>
                      )}
                      <Badge className="bg-white/95 text-gray-800 font-medium rounded-full px-3 py-1 shadow-lg">
                        {listing.condition}
                      </Badge>
                      {listing.user?.verified && (
                        <Badge className="bg-blue-500 text-white rounded-full px-3 py-1 shadow-lg">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>

                    {/* Heart button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full w-12 h-12 p-0 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-lg hover:scale-110"
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleFavorite(listing.id);
                      }}
                    >
                      <Heart className="w-5 h-5" />
                    </Button>

                    {/* Enhanced Stats overlay */}
                    <div className="absolute bottom-4 left-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <div className="flex items-center gap-1 bg-white/95 rounded-full px-3 py-2 text-sm font-medium shadow-lg">
                        <Eye className="w-4 h-4" />
                        {listing.views}
                      </div>
                      <div className="flex items-center gap-1 bg-white/95 rounded-full px-3 py-2 text-sm font-medium shadow-lg">
                        <Heart className="w-4 h-4" />
                        {listing.likes}
                      </div>
                      <div className="flex items-center gap-1 bg-white/95 rounded-full px-3 py-2 text-sm font-medium shadow-lg">
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-2 font-blinker line-clamp-1 group-hover:text-tabadol-purple transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2 font-medium">
                          {listing.brand} • Size {listing.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-tabadol-purple">
                          {listing.price || "0"}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {listing.originalPrice || "0"}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-1"
                        >
                          {(() => {
                            try {
                              const price = listing.price || "0";
                              const originalPrice =
                                listing.originalPrice || "0";
                              const priceNum = parseInt(price) || 0;
                              const originalPriceNum =
                                parseInt(originalPrice) || 0;

                              if (originalPriceNum === 0) return "0";

                              return Math.round(
                                (1 - priceNum / originalPriceNum) * 100,
                              );
                            } catch (error) {
                              return "0";
                            }
                          })()}
                          % off
                        </Badge>
                      </div>
                    </div>

                    {viewMode === "grid" && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={listing.user?.avatar}
                          alt={listing.user?.name}
                          className="w-8 h-8 rounded-full border-2 border-gray-200"
                        />
                        <div>
                          <span className="text-sm font-semibold block">
                            {listing.user?.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-600">
                              {listing.user?.rating} ({listing.user?.trades}{" "}
                              trades)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {listing.location &&
                        typeof listing.location === "string"
                          ? listing.location.split(",")[0]
                          : "Unknown"}
                      </div>
                    </div>

                    {(() => {
                      // Safely get valid wanted items
                      const validWantedItems = (
                        listing.wantedItems || []
                      ).filter((item) => {
                        return (
                          item !== null &&
                          item !== undefined &&
                          typeof item === "string" &&
                          item.length > 0 &&
                          item.trim().length > 0
                        );
                      });

                      // Only render if we have valid items
                      if (validWantedItems.length === 0) {
                        return null;
                      }

                      return (
                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-3 font-medium">
                            Looking for:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {validWantedItems.slice(0, 3).map((item, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs rounded-full px-3 py-1 bg-gray-100 hover:bg-tabadol-purple hover:text-white transition-colors"
                              >
                                {item}
                              </Badge>
                            ))}
                            {validWantedItems.length > 3 && (
                              <Badge
                                variant="secondary"
                                className="text-xs rounded-full px-3 py-1 bg-gray-100"
                              >
                                +{validWantedItems.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced Load More */}
        {!isLoading && !error && activeListings.length > 0 && (
          <div className="text-center mt-16">
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Showing {activeListings.length} of 1,247 items
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <div
                  className="bg-gradient-tabadol h-2 rounded-full"
                  style={{ width: "15%" }}
                ></div>
              </div>
            </div>
            <Button
              variant="outline"
              className="px-12 py-4 rounded-full border-2 hover:border-tabadol-purple hover:text-tabadol-purple transition-all duration-300 text-lg font-semibold"
            >
              Load More Items
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
