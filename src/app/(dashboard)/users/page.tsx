"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { 
  UserPlus, 
  Pencil, 
  Trash2, 
  Search,
  Loader2,
  ShieldCheck,
  User
} from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/page-header";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 25 });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "staff">("staff");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search: debouncedSearch
      });

      const res = await fetch(`/api/users?${queryParams}`);
      if (res.ok) {
        const result = await res.json();
        setUsers(result.data);
        setPagination(result.pagination);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch {
      toast.error("Error loading users");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    if (!username || !password || !fullName || !role) {
      toast.error("Please fill all required fields (username, password, name, role)");
      return;
    }

    try {
      const payload: Record<string, string> = { username, password, full_name: fullName, role };
      if (email) payload.email = email;
      
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("User created successfully");
        setIsAddOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create user");
      }
    } catch {
      toast.error("Error creating user");
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, role }),
      });

      if (res.ok) {
        toast.success("User updated successfully");
        setIsEditOpen(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update user");
      }
    } catch {
      toast.error("Error updating user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete user");
      }
    } catch {
      toast.error("Error deleting user");
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("staff");
  };

  const openEdit = (user: Profile) => {
    setSelectedUser(user);
    setFullName(user.full_name || "");
    setRole(user.role);
    setIsEditOpen(true);
  };

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Management" 
        description={`${pagination.total} staff accounts in the system`} 
        helpText="Manage staff access and permissions. You can create new user accounts, assign roles (Admin, Manager, Staff), and update contact details. Only Administrators should manage user permissions to ensure system security and data integrity."
        icon={User}
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className={buttonVariants({ variant: "default", size: "lg" })}>
            <UserPlus className="h-5 w-5" />
            Add User
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-xs w-[90vw]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="staff01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v: string | null) => setRole((v ?? "staff") as "admin" | "manager" | "staff")}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="h-11 px-6">
                Cancel
              </Button>
              <Button onClick={handleCreateUser} className="h-11 px-6">Create Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardContent></Card>

      <div className="space-y-4">
        <div className="border rounded-xl bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p>Loading users...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                          <User className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin"
                            ? "default"
                            : user.role === "manager"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {user.role === "admin" && (
                          <ShieldCheck className="mr-1 h-3 w-3" />
                        )}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            openEdit(user);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 sm:h-8 sm:w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            handleDeleteUser(user.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center py-4">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm sm:max-w-xs w-[90vw]">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={role} onValueChange={(v: string | null) => setRole((v ?? "staff") as "admin" | "manager" | "staff")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Note: Email and password cannot be changed from this screen.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
