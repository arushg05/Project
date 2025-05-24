import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
// Ensure API paths are updated if function locations changed (e.g., api.images.generateUploadUrl -> api.imageFunctions.generateUploadUrl)
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import React, { FormEvent, useRef, useState } from "react";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Animal Classifier</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex flex-col items-center justify-start p-8">
        <div className="w-full max-w-2xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center mt-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">AI Animal Identifier</h1>
        <Authenticated>
          <p className="text-lg text-secondary">
            Welcome, {loggedInUser?.email ?? "friend"}! Upload an image to identify animals.
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-lg text-secondary">Sign in to upload images and identify animals.</p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className="bg-white p-6 rounded-lg shadow">
         <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        <ImageUploader />
        <UserImages />
      </Authenticated>
    </div>
  );
}

function ImageUploader() {
  // Update API paths
  const generateUploadUrl = useMutation(api.imageFunctions.generateUploadUrl);
  const saveImage = useMutation(api.imageFunctions.saveImage);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [prompt, setPrompt] = useState<string>("Identify all animals in this image and classify them with as much detail as possible (e.g., species, breed if applicable). If no animals are present, state that clearly.");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedImage) return;

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });

      const { storageId } = await uploadResponse.json();
      if (!storageId) {
        throw new Error("Upload failed, no storageId returned.");
      }

      await saveImage({ storageId, prompt });

      setSelectedImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Consider adding user-facing error message here (e.g., using sonner)
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Upload Image</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="imagePrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Analysis Prompt:
          </label>
          <textarea
            id="imagePrompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
            placeholder="e.g., Identify all animals in this image..."
          />
           <p className="text-xs text-gray-500 mt-1">
            This prompt will be sent to the AI along with your image.
          </p>
        </div>
        <div>
          <label htmlFor="imageUpload" className="block text-sm font-medium text-gray-700 mb-1">
            Choose an image:
          </label>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            ref={imageInputRef}
            onChange={handleImageChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-hover hover:file:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={!selectedImage || isUploading}
          className="w-full px-4 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading & Analyzing..." : "Upload & Analyze"}
        </button>
      </form>
    </div>
  );
}

function UserImages() {
  // Update API path
  const userImages = useQuery(api.imageFunctions.getUserImages);

  if (userImages === undefined) {
    return (
      <div className="mt-8 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userImages.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-500">
        <p>You haven't uploaded any images yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Your Classified Images</h3>
      {userImages.map((image) => (
        <div key={image._id} className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row gap-4">
          {image.url && (
            <img src={image.url} alt="Uploaded animal" className="w-full md:w-1/3 h-auto object-cover rounded-md" />
          )}
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Uploaded: {new Date(image._creationTime).toLocaleString()}</p>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Prompt:</span> {image.prompt}
            </p>
            <h4 className="text-md font-semibold text-gray-700 mb-1">Classification:</h4>
            {image.classification === undefined ? (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Processing...
              </div>
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{image.classification}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
