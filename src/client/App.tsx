import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Checkbox,
  Container,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  Archive,
  CalendarClock,
  Download,
  FileBox,
  FilePenLine,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Upload
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { getTodayDateString, isPastDateString } from '../shared/dates';
import type { Cutter, SizeAxis } from '../shared/types';
import {
  createCutter,
  cutterPreviewUrl,
  downloadFile,
  listCutters,
  unarchiveCutter,
  updateCutter,
  uploadCutterFile
} from './api';

interface FormState {
  name: string;
  maxSizeInches: string | number;
  sizeAxis: SizeAxis;
  mirrorImage: boolean;
  dueDate: string | null;
}

const emptyForm: FormState = {
  name: '',
  maxSizeInches: '',
  sizeAxis: 'width',
  mirrorImage: false,
  dueDate: null
};

export function App(): JSX.Element {
  const [requests, setRequests] = useState<Cutter[]>([]);
  const [archived, setArchived] = useState<Cutter[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>('requests');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOpened, newModal] = useDisclosure(false);
  const [editCutter, setEditCutter] = useState<Cutter | null>(null);
  const [unarchiveTarget, setUnarchiveTarget] = useState<Cutter | null>(null);

  async function refresh(): Promise<void> {
    setError(null);
    const [nextRequests, nextArchived] = await Promise.all([listCutters(false), listCutters(true)]);
    setRequests(nextRequests);
    setArchived(nextArchived);
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function mutate(action: () => Promise<unknown>): Promise<void> {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const visibleCutters = activeTab === 'archived' ? archived : requests;

  return (
    <AppShell header={{ height: 72 }} padding={0}>
      <AppShell.Header className="app-header">
        <Container size="xl" className="header-inner">
          <Group gap="sm">
            <div className="brand-mark" aria-hidden="true">
              <FileBox size={24} />
            </div>
            <div>
              <Title order={1} className="app-title">
                Cookie HQ
              </Title>
            </div>
          </Group>
          <Tooltip label="New request">
            <ActionIcon size="lg" aria-label="New request" onClick={newModal.open}>
              <Plus size={20} />
            </ActionIcon>
          </Tooltip>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" className="main-shell">
          <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
            <Group justify="space-between" align="center" className="tabs-row">
              <Tabs.List>
                <Tabs.Tab value="requests">Requests</Tabs.Tab>
                <Tabs.Tab value="archived">Archived</Tabs.Tab>
              </Tabs.List>
              <Badge variant="light" size="lg">
                {visibleCutters.length}
              </Badge>
            </Group>

            {error ? (
              <Paper className="error-panel" role="alert">
                <Text fw={600}>Something needs attention</Text>
                <Text size="sm">{error}</Text>
              </Paper>
            ) : null}

            <Tabs.Panel value="requests" pt="md">
              <CutterCollection
                cutters={requests}
                archived={false}
                loading={loading}
                onEdit={setEditCutter}
                onArchive={(cutter) => mutate(() => updateCutter(cutter.id, { archived: true }))}
              />
            </Tabs.Panel>
            <Tabs.Panel value="archived" pt="md">
              <CutterCollection
                cutters={archived}
                archived
                loading={loading}
                onEdit={setEditCutter}
                onUnarchive={setUnarchiveTarget}
              />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>

      <NewCutterModal
        opened={newOpened}
        onClose={newModal.close}
        onSubmit={(input, image) =>
          mutate(async () => {
            await createCutter(input, image);
            newModal.close();
            setActiveTab('requests');
          })
        }
      />
      <EditCutterModal
        cutter={editCutter}
        onClose={() => setEditCutter(null)}
        onSubmit={(cutter, input, fusionFile, printFile) =>
          mutate(async () => {
            await updateCutter(cutter.id, input);
            if (fusionFile) {
              await uploadCutterFile(cutter.id, 'fusion', fusionFile);
            }
            if (printFile) {
              await uploadCutterFile(cutter.id, 'print', printFile);
            }
            setEditCutter(null);
          })
        }
      />
      <UnarchiveModal
        cutter={unarchiveTarget}
        onClose={() => setUnarchiveTarget(null)}
        onSubmit={(cutter, dueDate) =>
          mutate(async () => {
            await unarchiveCutter(cutter.id, dueDate);
            setUnarchiveTarget(null);
            setActiveTab('requests');
          })
        }
      />
    </AppShell>
  );
}

interface CutterCollectionProps {
  cutters: Cutter[];
  archived: boolean;
  loading: boolean;
  onEdit: (cutter: Cutter) => void;
  onArchive?: (cutter: Cutter) => void;
  onUnarchive?: (cutter: Cutter) => void;
}

function CutterCollection(props: CutterCollectionProps): JSX.Element {
  if (props.loading) {
    return (
      <Paper className="empty-panel">
        <Text c="dimmed">Loading</Text>
      </Paper>
    );
  }

  if (props.cutters.length === 0) {
    return (
      <Paper className="empty-panel">
        <Text c="dimmed">{props.archived ? 'No archived items' : 'No requests yet'}</Text>
      </Paper>
    );
  }

  return (
    <>
      <Paper className="desktop-table">
        <ScrollArea>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Max size</Table.Th>
                <Table.Th>Due</Table.Th>
                <Table.Th>Files</Table.Th>
                <Table.Th className="actions-heading">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {props.cutters.map((cutter) => (
                <Table.Tr key={cutter.id}>
                  <Table.Td>
                    <CutterIdentity cutter={cutter} />
                  </Table.Td>
                  <Table.Td>{formatSize(cutter)}</Table.Td>
                  <Table.Td>{formatDate(cutter.dueDate)}</Table.Td>
                  <Table.Td>
                    <FileBadges cutter={cutter} />
                  </Table.Td>
                  <Table.Td>
                    <RowActions {...props} cutter={cutter} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
      <Stack className="mobile-list" gap="sm">
        {props.cutters.map((cutter) => (
          <Paper className="mobile-card" key={cutter.id}>
            <Group justify="space-between" align="start" gap="sm">
              <CutterIdentity cutter={cutter} showSize />
              <Badge variant="light" leftSection={<CalendarClock size={12} />}>
                {formatDate(cutter.dueDate)}
              </Badge>
            </Group>
            <FileBadges cutter={cutter} />
            <RowActions {...props} cutter={cutter} />
          </Paper>
        ))}
      </Stack>
    </>
  );
}

function CutterIdentity({ cutter, showSize = false }: { cutter: Cutter; showSize?: boolean }): JSX.Element {
  return (
    <Group gap="sm" wrap="nowrap" className="cutter-identity">
      <img className="cutter-thumbnail" src={cutterPreviewUrl(cutter)} alt={`${cutter.name} preview`} loading="lazy" />
      <div className="cutter-name-copy">
        <Text fw={showSize ? 700 : 600} truncate>
          {cutter.name}
        </Text>
        {showSize ? (
          <Text size="sm" c="dimmed">
            {formatSize(cutter)}
          </Text>
        ) : null}
        {cutter.mirrorImage ? (
          <Text size="xs" c="dimmed">
            Mirrored PNG
          </Text>
        ) : null}
      </div>
    </Group>
  );
}

function FileBadges({ cutter }: { cutter: Cutter }): JSX.Element {
  return (
    <Group gap={6}>
      <Badge variant="light" color="teal" leftSection={<ImageIcon size={12} />}>
        Image
      </Badge>
      {cutter.fusionFile ? (
        <Badge variant="light" color="indigo" leftSection={<FilePenLine size={12} />}>
          Fusion
        </Badge>
      ) : null}
      {cutter.printFile ? (
        <Badge variant="light" color="orange" leftSection={<FileBox size={12} />}>
          {cutter.modelPreviewFile ? '3MF' : 'Print'}
        </Badge>
      ) : null}
    </Group>
  );
}

interface RowActionsProps extends CutterCollectionProps {
  cutter: Cutter;
}

function RowActions({ cutter, archived, onEdit, onArchive, onUnarchive }: RowActionsProps): JSX.Element {
  return (
    <Group gap={6} justify="flex-end" wrap="nowrap" className="row-actions">
      <Tooltip label="Download PNG">
        <ActionIcon variant="subtle" aria-label={`Download PNG for ${cutter.name}`} onClick={() => downloadFile(cutter.id, 'png')}>
          <Download size={18} />
        </ActionIcon>
      </Tooltip>
      {cutter.fusionFile ? (
        <Tooltip label="Download Fusion file">
          <ActionIcon
            variant="subtle"
            aria-label={`Download Fusion file for ${cutter.name}`}
            onClick={() => downloadFile(cutter.id, 'fusion')}
          >
            <FilePenLine size={18} />
          </ActionIcon>
        </Tooltip>
      ) : null}
      {cutter.printFile ? (
        <Tooltip label="Download print file">
          <ActionIcon
            variant="subtle"
            aria-label={`Download print file for ${cutter.name}`}
            onClick={() => downloadFile(cutter.id, 'print')}
          >
            <FileBox size={18} />
          </ActionIcon>
        </Tooltip>
      ) : null}
      {!archived ? (
        <>
          <Tooltip label="Edit request">
            <ActionIcon variant="subtle" aria-label={`Edit ${cutter.name}`} onClick={() => onEdit(cutter)}>
              <Pencil size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Archive">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Archive ${cutter.name}`}
              onClick={() => onArchive?.(cutter)}
            >
              <Archive size={18} />
            </ActionIcon>
          </Tooltip>
        </>
      ) : (
        <Tooltip label="Unarchive">
          <ActionIcon
            variant="subtle"
            color="teal"
            aria-label={`Unarchive ${cutter.name}`}
            onClick={() => onUnarchive?.(cutter)}
          >
            <RotateCcw size={18} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

interface NewCutterModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof createCutter>[0], image: File) => Promise<void>;
}

function NewCutterModal({ opened, onClose, onSubmit }: NewCutterModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(): void {
    setForm(emptyForm);
    setImage(null);
    setError(null);
  }

  async function handleSubmit(): Promise<void> {
    const parsed = parseForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    if (!image) {
      setError('Image attachment is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(parsed.value, image);
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New request"
      centered
    >
      <Stack>
        <CutterFields form={form} onChange={setForm} showMirrorImage={false} />
        <FileInput
          label="Cookie cutter image"
          placeholder="Select image"
          accept="image/*"
          value={image}
          onChange={setImage}
          leftSection={<Upload size={16} />}
          required
          withAsterisk
        />
        <MirrorImageCheckbox form={form} onChange={setForm} />
        {error ? <Text c="red">{error}</Text> : null}
        <Button onClick={() => void handleSubmit()} loading={submitting}>
          Submit
        </Button>
      </Stack>
    </Modal>
  );
}

interface EditCutterModalProps {
  cutter: Cutter | null;
  onClose: () => void;
  onSubmit: (cutter: Cutter, input: Parameters<typeof updateCutter>[1], fusionFile: File | null, printFile: File | null) => Promise<void>;
}

function EditCutterModal({ cutter, onClose, onSubmit }: EditCutterModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fusionFile, setFusionFile] = useState<File | null>(null);
  const [printFile, setPrintFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cutter) {
      setForm({
        name: cutter.name,
        maxSizeInches: cutter.maxSizeInches,
        sizeAxis: cutter.sizeAxis,
        mirrorImage: cutter.mirrorImage,
        dueDate: cutter.dueDate
      });
      setFusionFile(null);
      setPrintFile(null);
      setError(null);
    }
  }, [cutter]);

  async function handleSubmit(): Promise<void> {
    if (!cutter) {
      return;
    }

    const parsed = parseForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(cutter, parsed.value, fusionFile, printFile);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal opened={Boolean(cutter)} onClose={onClose} title="Edit request" centered>
      <Stack>
        <CutterFields form={form} onChange={setForm} />
        <FileInput
          label="Fusion 360 file"
          placeholder={cutter?.fusionFile?.originalName ?? 'Select .f3d or .f3z'}
          accept=".f3d,.f3z"
          value={fusionFile}
          onChange={setFusionFile}
          leftSection={<Upload size={16} />}
        />
        <FileInput
          label="Print file"
          placeholder={cutter?.printFile?.originalName ?? 'Select .stl or .3mf'}
          accept=".stl,.3mf"
          value={printFile}
          onChange={setPrintFile}
          leftSection={<Upload size={16} />}
        />
        {error ? <Text c="red">{error}</Text> : null}
        <Button onClick={() => void handleSubmit()} loading={submitting}>
          Save
        </Button>
      </Stack>
    </Modal>
  );
}

interface UnarchiveModalProps {
  cutter: Cutter | null;
  onClose: () => void;
  onSubmit: (cutter: Cutter, dueDate: string) => Promise<void>;
}

function UnarchiveModal({ cutter, onClose, onSubmit }: UnarchiveModalProps): JSX.Element {
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cutter) {
      setDueDate(null);
      setError(null);
    }
  }, [cutter]);

  async function handleSubmit(): Promise<void> {
    if (!cutter) {
      return;
    }
    if (!dueDate) {
      setError('New due date is required.');
      return;
    }
    if (isPastDateString(dueDate)) {
      setError('Due date cannot be in the past.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(cutter, dueDate);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal opened={Boolean(cutter)} onClose={onClose} title="Unarchive request" centered>
      <Stack>
        <Text fw={600}>{cutter?.name}</Text>
        <DatePickerInput
          label="New due date"
          placeholder="Pick due date"
          value={dueDate}
          onChange={setDueDate}
          minDate={getTodayDateString()}
          dropdownType="modal"
          valueFormat="MMM D, YYYY"
        />
        {error ? <Text c="red">{error}</Text> : null}
        <Button onClick={() => void handleSubmit()} loading={submitting}>
          Add back to Requests
        </Button>
      </Stack>
    </Modal>
  );
}

function CutterFields({
  form,
  onChange,
  showMirrorImage = true
}: {
  form: FormState;
  onChange: (form: FormState) => void;
  showMirrorImage?: boolean;
}): JSX.Element {
  const axisLabel = useMemo(() => (form.sizeAxis === 'width' ? 'Max width' : 'Max height'), [form.sizeAxis]);

  return (
    <>
      <TextInput
        label="Cookie cutter name"
        value={form.name}
        onChange={(event) => onChange({ ...form, name: event.currentTarget.value })}
      />
      <Group grow align="end">
        <NumberInput
          label={axisLabel}
          value={form.maxSizeInches}
          min={0.1}
          step={0.25}
          suffix=" in"
          onChange={(value) => onChange({ ...form, maxSizeInches: value })}
        />
        <SegmentedControl
          aria-label="Max size axis"
          data={[
            { value: 'width', label: 'Width' },
            { value: 'height', label: 'Height' }
          ]}
          value={form.sizeAxis}
          onChange={(value) => onChange({ ...form, sizeAxis: value as SizeAxis })}
        />
      </Group>
      {showMirrorImage ? <MirrorImageCheckbox form={form} onChange={onChange} /> : null}
      <DatePickerInput
        label="Due date"
        placeholder="Pick due date"
        value={form.dueDate}
        onChange={(value) => onChange({ ...form, dueDate: value })}
        minDate={getTodayDateString()}
        dropdownType="modal"
        valueFormat="MMM D, YYYY"
      />
    </>
  );
}

function MirrorImageCheckbox({
  form,
  onChange
}: {
  form: FormState;
  onChange: (form: FormState) => void;
}): JSX.Element {
  return (
    <Checkbox
      label="Mirror image"
      checked={form.mirrorImage}
      onChange={(event) => onChange({ ...form, mirrorImage: event.currentTarget.checked })}
    />
  );
}

function parseForm(form: FormState):
  | { ok: true; value: Parameters<typeof createCutter>[0] }
  | { ok: false; error: string } {
  const maxSize = Number(form.maxSizeInches);

  if (!form.name.trim()) {
    return { ok: false, error: 'Name is required.' };
  }

  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    return { ok: false, error: 'Max size must be greater than zero.' };
  }

  if (!form.dueDate) {
    return { ok: false, error: 'Due date is required.' };
  }

  if (isPastDateString(form.dueDate)) {
    return { ok: false, error: 'Due date cannot be in the past.' };
  }

  return {
    ok: true,
    value: {
      name: form.name.trim(),
      maxSizeInches: maxSize,
      sizeAxis: form.sizeAxis,
      mirrorImage: form.mirrorImage,
      dueDate: form.dueDate
    }
  };
}

function formatSize(cutter: Cutter): string {
  return `${cutter.maxSizeInches}" ${cutter.sizeAxis}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error.';
}
