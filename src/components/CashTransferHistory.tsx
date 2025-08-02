import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashTransfers } from "@/hooks/useCashTransfers";
import { useAccounts } from "@/hooks/useAccounts";
import { format } from "date-fns";
import { id } from "date-fns/locale/id";
import { Skeleton } from "./ui/skeleton";

export function CashTransferHistory() {
  const { transfers, isLoading } = useCashTransfers();
  const { accounts } = useAccounts();

  const getAccountName = (accountId: string) => {
    return accounts?.find(acc => acc.id === accountId)?.name || accountId;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Transfer Kas</CardTitle>
        <CardDescription>Daftar transfer kas antar akun yang telah dilakukan.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Dari Akun</TableHead>
                <TableHead>Ke Akun</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Oleh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : transfers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Belum ada transfer kas yang dilakukan.
                  </TableCell>
                </TableRow>
              ) : (
                transfers?.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      {format(transfer.transferDate, "d MMM yyyy HH:mm", { locale: id })}
                    </TableCell>
                    <TableCell>{getAccountName(transfer.fromAccountId)}</TableCell>
                    <TableCell>{getAccountName(transfer.toAccountId)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR"
                      }).format(transfer.amount)}
                    </TableCell>
                    <TableCell>
                      {transfer.description || "-"}
                    </TableCell>
                    <TableCell>{transfer.transferredByName || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}