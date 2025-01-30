type ProjectCardProps = {
  title: string;
  description: string;
  status: string;
  location: string;
  createdAt: string;
  imageUrl?: string; // Optional property for the image URL
};

export default function ProjectCard({
  title,
  description,
  status,
  location,
  createdAt,
  imageUrl = 'https://via.placeholder.com/320x180', // Default placeholder image
}: ProjectCardProps) {
  return (
    <div className="bg-white shadow-md rounded-lg border border-gray-200 overflow-hidden">
      {/* Image */}
      <div className="relative w-full h-48">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-800 line-clamp-2">{title}</h2>
        <p className="text-sm text-gray-600 mt-2 line-clamp-3">{description}</p>
        <p className="text-sm text-gray-500 mt-2">
          <strong>Status:</strong> {status}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          <strong>Location:</strong> {location}
        </p>
        <p className="text-xs text-gray-400 mt-4">
          <strong>Created At:</strong> {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
