import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CRMAccountsView } from "../../components/crm/CRMAccountsView";
import { AppProvider, useApp } from "../../context/AppContext";
import { Account } from "../../types/crm";

const CSV = [
  "Customer Name,Customer Style,Address 1,Address 2,Contact,Phone",
  '108 Franklin Pty Ltd,Account,"266 Glen Osmond Road, Fullarton SA 5063",,Jim Apostolou,',
  "Acrow,Account,1651-1657 Centre Road,Springvale VIC 3171,Giancarlo Tigani,03 9582 2777",
  "A&A Building Services Pty Ltd,Prospect,,,Jamie Winship,"
].join("\n");

// The current export: the customer's standing and the rep who owns them ride
// along with the same six columns.
const REP_CSV = [
  "Customer Name,Customer Style,Address 1,Address 2,Contact,Phone,CUSTOMERSTATUS,SALESPERSON",
  "Commlec Services,Account,4/40 Ricketts Rd,Mt Waverley VIC 3149,Mike Howie,9543 1772,Active,Bilal Akhtar",
  "Ahrens,Account,,,Mark Rosiak,,Active,Alan Berryman",
  "FORGE,Prospect,,,Aaron,,Active,"
].join("\n");

/** Renders "name=owner" for every account so the written allocation is visible to the test. */
const OwnerProbe: React.FC<{ seed?: Account[] }> = ({ seed }) => {
  const { accounts, addAccount } = useApp();
  React.useEffect(() => {
    (seed || []).forEach((acc) => addAccount(acc));
  }, []);
  return (
    <>
      <div data-testid="owners">{accounts.map((a) => `${a.name}=${a.accountOwner}`).join("|")}</div>
      <CRMAccountsView />
    </>
  );
};

const SeededAccounts: React.FC<{ seed?: Account[] }> = ({ seed }) => {
  const { addAccount } = useApp();
  React.useEffect(() => {
    (seed || []).forEach((acc) => addAccount(acc));
  }, []);
  return <CRMAccountsView />;
};

const uploadCsv = async (text: string, fileName = "CustomerList.csv") => {
  const input = screen.getByLabelText(/Customer list CSV file/i) as HTMLInputElement;
  const file = new File([text], fileName, { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByText(fileName)).toBeInTheDocument());
};

const openImportModal = () => {
  fireEvent.click(screen.getAllByRole("button", { name: /Import CSV/i })[0]);
};

describe("Account CSV import", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  it("offers an Import CSV action from the empty accounts screen", () => {
    render(
      <AppProvider>
        <CRMAccountsView />
      </AppProvider>
    );

    expect(screen.getAllByRole("button", { name: /Import CSV/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("previews what will be created and writes nothing until Import is pressed", async () => {
    render(
      <AppProvider>
        <CRMAccountsView />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv(CSV);

    // Preview only: the directory behind the dialog is still empty.
    expect(screen.getByText(/No accounts yet/i)).toBeInTheDocument();

    const dialog = screen.getByRole("dialog", { name: /Import accounts from a CSV/i });
    expect(within(dialog).getByText("Acrow")).toBeInTheDocument();
    expect(within(dialog).getByText("Giancarlo Tigani")).toBeInTheDocument();
    expect(within(dialog).getByText("Springvale, VIC")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Will be added")).toHaveLength(3);

    fireEvent.click(within(dialog).getByRole("button", { name: /Import 3 accounts/i }));

    await waitFor(() => expect(screen.getByText(/Import finished/i)).toBeInTheDocument());
    expect(screen.getByText(/Added 3 accounts and 3 contacts/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Done$/i }));

    await waitFor(() => expect(screen.queryByText(/No accounts yet/i)).not.toBeInTheDocument());
    expect(screen.getAllByText("Acrow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("108 Franklin Pty Ltd").length).toBeGreaterThan(0);

    // One audit entry for the import, not one per row: the log keeps only the
    // last 500 records, so a bulk import must not evict the history behind it.
    const audit = JSON.parse(localStorage.getItem("plasgain_audit_logs") || "[]");
    const importEntries = audit.filter((entry: { details: string }) => /^Imported /.test(entry.details));
    expect(importEntries).toHaveLength(1);
    expect(importEntries[0].details).toContain("3 accounts and 3 contacts");
    expect(importEntries[0].entityName).toBe("CustomerList.csv");
  });

  it("skips rows that match an account already in the CRM", async () => {
    render(
      <AppProvider>
        <SeededAccounts
          seed={[
            {
              id: "acc-existing",
              name: "Acrow",
              accountType: "Account",
              status: "Customer",
              territory: "VIC/TAS",
              accountOwner: "Travis Maher"
            }
          ]}
        />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv(CSV);

    const dialog = screen.getByRole("dialog", { name: /Import accounts from a CSV/i });
    expect(within(dialog).getByText(/Already in the CRM as "Acrow"/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Import 2 accounts/i })).toBeInTheDocument();
  });

  it("explains why a file without a customer name column cannot be imported", async () => {
    render(
      <AppProvider>
        <CRMAccountsView />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv("Widget,Price\nBollard,10", "products.csv");

    expect(screen.getByText(/No customer name column found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import 0 accounts$/i })).toBeDisabled();
  });

  it("can leave the contacts out of the import", async () => {
    render(
      <AppProvider>
        <CRMAccountsView />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv(CSV);

    const dialog = screen.getByRole("dialog", { name: /Import accounts from a CSV/i });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: /Import 3 accounts/i }));

    await waitFor(() => expect(screen.getByText(/Import finished/i)).toBeInTheDocument());
    expect(screen.getByText(/Added 3 accounts\./i)).toBeInTheDocument();
  });

  it("allocates each account to the salesperson named in the file", async () => {
    render(
      <AppProvider>
        <OwnerProbe />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv(REP_CSV);

    const dialog = screen.getByRole("dialog", { name: /Import accounts from a CSV/i });
    expect(within(dialog).getByText(/Allocation from the SALESPERSON column/i)).toBeInTheDocument();
    // Reps who are not on the team are still allocated, and called out.
    expect(within(dialog).getByText(/named in the file but not on the team/i)).toBeInTheDocument();
    // The row with no rep falls to the person running the import.
    expect(within(dialog).getByText(/no salesperson in the file/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Import 3 accounts/i }));

    await waitFor(() => expect(screen.getByText(/Import finished/i)).toBeInTheDocument());
    const owners = screen.getByTestId("owners").textContent || "";
    expect(owners).toContain("Commlec Services=Bilal Akhtar");
    expect(owners).toContain("Ahrens=Alan Berryman");
    expect(owners).toContain("FORGE=Travis Maher");
  });

  it("corrects the owner on an account already in the CRM", async () => {
    render(
      <AppProvider>
        <OwnerProbe
          seed={[
            {
              id: "acc-existing",
              name: "Ahrens",
              accountType: "Account",
              status: "Customer",
              territory: "VIC/TAS",
              accountOwner: "Travis Maher"
            }
          ]}
        />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv(REP_CSV);

    const dialog = screen.getByRole("dialog", { name: /Import accounts from a CSV/i });
    expect(within(dialog).getByText(/Travis Maher → Alan Berryman/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("checkbox", { name: /correct the owner on 1 existing account/i })
    ).toBeChecked();

    fireEvent.click(within(dialog).getByRole("button", { name: /Import 2 accounts/i }));

    await waitFor(() => expect(screen.getByText(/Import finished/i)).toBeInTheDocument());
    expect(screen.getByText(/Reallocated 1 existing account/i)).toBeInTheDocument();
    expect(screen.getByTestId("owners").textContent).toContain("Ahrens=Alan Berryman");
  });

  it("leaves an existing owner alone when the correction is unticked", async () => {
    render(
      <AppProvider>
        <OwnerProbe
          seed={[
            {
              id: "acc-existing",
              name: "Ahrens",
              accountType: "Account",
              status: "Customer",
              territory: "VIC/TAS",
              accountOwner: "Travis Maher"
            }
          ]}
        />
      </AppProvider>
    );

    openImportModal();
    await uploadCsv(REP_CSV);

    const dialog = screen.getByRole("dialog", { name: /Import accounts from a CSV/i });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /correct the owner on 1 existing account/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Import 2 accounts/i }));

    await waitFor(() => expect(screen.getByText(/Import finished/i)).toBeInTheDocument());
    expect(screen.queryByText(/Reallocated/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("owners").textContent).toContain("Ahrens=Travis Maher");
  });
});
