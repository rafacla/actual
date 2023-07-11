import React, {
  forwardRef,
  memo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { format as formatDate, parseISO } from 'date-fns';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { initiallyLoadPayees } from 'loot-core/src/client/actions/queries';
import q from 'loot-core/src/client/query-helpers';
import { liveQueryContext } from 'loot-core/src/client/query-hooks';
import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { mapField, friendlyOp } from 'loot-core/src/shared/creditcards';
import { getMonthYearFormat } from 'loot-core/src/shared/months';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useSelected, {
  useSelectedDispatch,
  useSelectedItems,
  SelectedProvider,
} from '../hooks/useSelected';
import ArrowRight from '../icons/v0/RightArrow2';
import { colors } from '../style';

import {
  View,
  Text,
  Button,
  Stack,
  ExternalLink,
  Input,
  LinkButton,
} from './common';
import {
  SelectCell,
  Row,
  Field,
  Cell,
  CellButton,
  TableHeader,
  useTableNavigator,
} from './table';

let SchedulesQuery = liveQueryContext(q('schedules').select('*'));


export function Value({
  value,
  field,
  valueIsRaw,
  inline = false,
  data: dataProp,
  describe = x => x.name,
}) {
  let { data, dateFormat } = useSelector(state => {
    let data;
    if (dataProp) {
      data = dataProp;
    } else {
      switch (field) {
        case 'payee':
          data = state.queries.payees;
          break;
        case 'category':
          data = state.queries.categories.list;
          break;
        case 'account':
          data = state.queries.accounts;
          break;
        default:
          data = [];
      }
    }

    return {
      data,
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });
  let [expanded, setExpanded] = useState(false);

  function onExpand(e) {
    e.preventDefault();
    setExpanded(true);
  }

  function formatValue(value) {
    if (value == null || value === '') {
      return '(nothing)';
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else {
      switch (field) {
        case 'amount':
          return integerToCurrency(value);
        case 'date':
          if (value) {
            if (value.frequency) {
              return getRecurringDescription(value);
            }
            return formatDate(parseISO(value), dateFormat);
          }
          return null;
        case 'month':
          return value
            ? formatDate(parseISO(value), getMonthYearFormat(dateFormat))
            : null;
        case 'year':
          return value ? formatDate(parseISO(value), 'yyyy') : null;
        case 'notes':
        case 'imported_payee':
          return value;
        case 'payee':
        case 'category':
        case 'account':
        default:
          throw new Error(`Unknown field ${field}`);
      }
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text style={{ color: colors.p4 }}>(empty)</Text>;
    } else if (value.length === 1) {
      return (
        <Text>
          [<Text style={{ color: colors.p4 }}>{formatValue(value[0])}</Text>]
        </Text>
      );
    }

    let displayed = value;
    if (!expanded && value.length > 4) {
      displayed = value.slice(0, 3);
    }
    let numHidden = value.length - displayed.length;
    return (
      <Text style={{ color: colors.n3 }}>
        [
        {displayed.map((v, i) => {
          let text = <Text style={{ color: colors.p4 }}>{formatValue(v)}</Text>;
          let spacing;
          if (inline) {
            spacing = i !== 0 ? ' ' : '';
          } else {
            spacing = (
              <>
                {i === 0 && <br />}
                &nbsp;&nbsp;
              </>
            );
          }

          return (
            <Text key={i}>
              {spacing}
              {text}
              {i === value.length - 1 ? '' : ','}
              {!inline && <br />}
            </Text>
          );
        })}
        {numHidden > 0 && (
          <Text style={{ color: colors.p4 }}>
            &nbsp;&nbsp;
            <LinkButton onClick={onExpand} style={{ color: colors.p4 }}>
              {numHidden} more items...
            </LinkButton>
            {!inline && <br />}
          </Text>
        )}
        ]
      </Text>
    );
  } else if (value && value.num1 != null && value.num2 != null) {
    // An "in between" type
    return (
      <Text>
        <Text style={{ color: colors.p4 }}>{formatValue(value.num1)}</Text> and{' '}
        <Text style={{ color: colors.p4 }}>{formatValue(value.num2)}</Text>
      </Text>
    );
  } else {
    return <Text style={{ color: colors.p4 }}>{formatValue(value)}</Text>;
  }
}

function describeSchedule(schedule, payee) {
  if (payee) {
    return `${payee.name} (${schedule.next_date})`;
  } else {
    return `Next: ${schedule.next_date}`;
  }
}

function ScheduleValue({ value }) {
  let payees = useSelector(state => state.queries.payees);
  let byId = getPayeesById(payees);
  let { data: schedules } = SchedulesQuery.useQuery();

  return (
    <Value
      value={value}
      field="creditCard"
      data={schedules}
      describe={schedule => describeSchedule(schedule, byId[schedule._payee])}
    />
  );
}

function ActionExpression({ field, op, value, options, style }) {
  return (
    <View
      style={[
        {
          display: 'block',
          maxWidth: '100%',
          backgroundColor: colors.n10,
          borderRadius: 4,
          padding: '3px 5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        style,
      ]}
    >
      {op === 'set' ? (
        <>
          <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
          <Text style={{ color: colors.p4 }}>{mapField(field, options)}</Text>{' '}
          <Text style={{ color: colors.n3 }}>to </Text>
          <Value value={value} field={field} />
        </>
      ) : op === 'link-schedule' ? (
        <>
          <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
          <ScheduleValue value={value} />
        </>
      ) : null}
    </View>
  );
}

let CreditCard = memo(
  ({
    creditCard,
    hovered,
    selected,
    editing,
    focusedField,
    onHover,
    onEdit,
    onEditCreditCard,
  }) => {
    let dispatchSelected = useSelectedDispatch();
    let borderColor = selected ? colors.b8 : colors.border;
    let backgroundFocus = hovered || focusedField === 'select';

    return (
      <Row
        height="auto"
        borderColor={borderColor}
        backgroundColor={
          selected ? colors.selected : backgroundFocus ? colors.hover : 'white'
        }
        style={{ fontSize: 13, zIndex: editing || selected ? 101 : 'auto' }}
        collapsed="true"
        onMouseEnter={() => onHover && onHover(creditCard.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <SelectCell
          exposed={hovered || selected || editing}
          focused={focusedField === 'select'}
          onSelect={e => {
            dispatchSelected({ type: 'select', id: creditCard.id, event: e });
          }}
          onEdit={() => onEdit(creditCard.id, 'select')}
          selected={selected}
        />

        <Cell name="stage" width={50} plain style={{ color: colors.n5 }}>
          {creditCard.stage && (
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                backgroundColor: colors.b10,
                color: colors.b1,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              {creditCard.stage}
            </View>
          )}
        </Cell>

        <Field width="flex" style={{ padding: '15px 0' }} truncate={false}>
          <Stack direction="row" align="center">
            <Text>
              <ArrowRight color={colors.n4} style={{ width: 12, height: 12 }} />
            </Text>

            <View
              style={{ flex: 1, alignItems: 'flex-start' }}
              data-testid="actions"
            >
              {creditCard.actions.map((action, i) => (
                <ActionExpression
                  key={i}
                  field={action.field}
                  op={action.op}
                  value={action.value}
                  options={action.options}
                  style={i !== 0 && { marginTop: 3 }}
                />
              ))}
            </View>
          </Stack>
        </Field>

        <Cell
          name="edit"
          focused={focusedField === 'edit'}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <Button
            as={CellButton}
            onSelect={() => onEditCreditCard(creditCard)}
            onEdit={() => onEdit(creditCard.id, 'edit')}
          >
            Edit
          </Button>
        </Cell>
      </Row>
    );
  },
);

let SimpleTable = forwardRef(
  (
    { data, navigator, loadMore, style, onHoverLeave, children, ...props },
    ref,
  ) => {
    let contentRef = useRef();
    let contentHeight = useRef();
    let scrollRef = useRef();
    let { getNavigatorProps } = navigator;

    function onScroll(e) {
      if (contentHeight.current != null) {
        if (loadMore && e.target.scrollTop > contentHeight.current - 750) {
          loadMore();
        }
      }
    }

    useEffect(() => {
      if (contentRef.current) {
        contentHeight.current =
          contentRef.current.getBoundingClientRect().height;
      } else {
        contentHeight.current = null;
      }
    }, [contentRef.current, data]);

    return (
      <View
        style={[
          {
            flex: 1,
            outline: 'none',
            '& .animated .animated-row': { transition: '.25s transform' },
          },
          style,
        ]}
        tabIndex="1"
        data-testid="table"
        {...getNavigatorProps(props)}
      >
        <View
          innerRef={scrollRef}
          style={{ maxWidth: '100%', overflow: 'auto' }}
          onScroll={onScroll}
        >
          <div ref={contentRef} onMouseLeave={onHoverLeave}>
            {children}
          </div>
        </View>
      </View>
    );
  },
);

function CreditCardsHeader() {
  let selectedItems = useSelectedItems();
  let dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader version="v2" style={{}}>
      <SelectCell
        exposed={true}
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
      />
      <Cell value="Stage" width={50} />
      <Cell value="CreditCard" width="flex" />
    </TableHeader>
  );
}

function CreditCardsList({
  creditCards,
  selectedItems,
  navigator,
  hoveredCreditCard,
  collapsed: borderCollapsed,
  onHover,
  onCollapse,
  onEditCreditCard,
}) {
  if (creditCards.length === 0) {
    return null;
  }

  return (
    <View>
      {creditCards.map(creditCard => {
        let hovered = hoveredCreditCard === creditCard.id;
        let selected = selectedItems.has(creditCard.id);
        let editing = navigator.editingId === creditCard.id;

        return (
          <CreditCard
            key={creditCard.id}
            creditCard={creditCard}
            hovered={hovered}
            selected={selected}
            editing={editing}
            focusedField={editing && navigator.focusedField}
            onHover={onHover}
            onEdit={navigator.onEdit}
            onEditCreditCard={onEditCreditCard}
          />
        );
      })}
    </View>
  );
}

function ManageCreditCardsContent({ isModal, accountId, setLoading }) {
  let [allCreditCards, setAllCreditCards] = useState(null);
  let [creditCards, setCreditCards] = useState(null);
  let [filter, setFilter] = useState('');
  let dispatch = useDispatch();
  let navigator = useTableNavigator(creditCards, ['select', 'edit']);

  let { data: schedules } = SchedulesQuery.useQuery();
  let filterData = useSelector(state => ({
    payees: state.queries.payees,
    categories: state.queries.categories.list,
    accounts: state.queries.accounts,
    schedules,
  }));

  let filteredCreditCards = useMemo(
    () =>
      filter === '' || !creditCards
        ? creditCards
        : creditCards.filter(creditCard =>
            creditCard.id.toLowerCase().includes(filter.toLowerCase()),
          ),
    [creditCards, filter, filterData],
  );
  let selectedInst = useSelected('manage-credit-cards', allCreditCards, []);
  let [hoveredCreditCard, setHoveredCreditCard] = useState(null);
  let tableRef = useRef(null);

  async function loadCreditCards() {
    setLoading(true);

    let loadedCreditCards = null;
    loadedCreditCards = await send('credit-cards-get');

    setAllCreditCards(loadedCreditCards);
    return loadedCreditCards;
  }

  useEffect(() => {
    async function loadData() {
      let loadedCreditCards = await loadCreditCards();
      setCreditCards(loadedCreditCards.slice(0, 100));
      setLoading(false);

      await dispatch(initiallyLoadPayees());
    }

    undo.setUndoState('openModal', 'manage-credit-cards');

    loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  }, []);

  function loadMore() {
    setCreditCards(
      creditCards.concat(
        allCreditCards.slice(creditCards.length, creditCards.length + 50),
      ),
    );
  }

  async function onDeleteSelected() {
    setLoading(true);
    let { someDeletionsFailed } = await send('credit-card-delete-all', [
      ...selectedInst.items,
    ]);

    if (someDeletionsFailed) {
      alert('Some cards were not deleted because of errors');
    }

    let newCreditCards = await loadCreditCards();
    setCreditCards(creditCards => {
      return newCreditCards.slice(0, creditCards.length);
    });
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }

  let onEditCreditCard = useCallback(creditCard => {
    dispatch(
      pushModal('edit-credit-card', {
        creditCard,
        onSave: async newCreditCard => {
          let newCreditCards = await loadCreditCards();

          setCreditCards(creditCards => {
            let newIdx = newCreditCards.findIndex(
              creditCard => creditCard.id === newCreditCard.id,
            );

            if (newIdx > creditCards.length) {
              return newCreditCards.slice(0, newIdx + 75);
            } else {
              return newCreditCards.slice(0, creditCards.length);
            }
          });

          setLoading(false);
        },
      }),
    );
  }, []);

  function onCreateCreditCard() {
    let creditCard = {
      account_id: null,
      processor_name: '',
      statement_closing_day: 1,
      payment_due_date: 8,
      credit_limit: 0,
    };

    dispatch(
      pushModal('edit-credit-card', {
        creditCard,
        onSave: async newCreditCard => {
          let newCreditCards = await loadCreditCards();

          navigator.onEdit(newCreditCard.id, 'edit');

          setCreditCards(creditCards => {
            let newIdx = newCreditCards.findIndex(
              creditCard => creditCard.id === newCreditCard.id,
            );
            return newCreditCards.slice(0, newIdx + 75);
          });

          setLoading(false);
        },
      }),
    );
  }

  let onHover = useCallback(id => {
    setHoveredCreditCard(id);
  }, []);

  if (creditCards === null) {
    return null;
  }

  return (
    <SelectedProvider instance={selectedInst}>
      <View style={{ overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: isModal ? '0 13px 15px' : '0 0 15px',
            flexShrink: 0,
          }}
        >
          <View
            style={{
              color: colors.n4,
              flexDirection: 'row',
              alignItems: 'center',
              width: '50%',
            }}
          >
            <Text>
              Credit Cards can be attached to an account to further improve your
              control on your statements and debit.{' '}
              <ExternalLink
                to="https://actualbudget.org/docs/budgeting/cards/"
                linkColor="muted"
              >
                Learn more
              </ExternalLink>
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Input
            placeholder="Filter cards..."
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              navigator.onEdit(null);
            }}
            style={{
              width: 350,
              borderColor: isModal ? null : 'transparent',
              backgroundColor: isModal ? null : colors.n11,
              ':focus': isModal
                ? null
                : {
                    backgroundColor: 'white',
                    '::placeholder': { color: colors.n8 },
                  },
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CreditCardsHeader />
          <SimpleTable
            ref={tableRef}
            data={filteredCreditCards}
            navigator={navigator}
            loadMore={loadMore}
            // Hide the last border of the item in the table
            style={{ marginBottom: -1 }}
          >
            <CreditCardsList
              creditCards={filteredCreditCards}
              selectedItems={selectedInst.items}
              navigator={navigator}
              hoveredCreditCard={hoveredCreditCard}
              onHover={onHover}
              onEditCreditCard={onEditCreditCard}
            />
          </SimpleTable>
        </View>
        <View
          style={{
            paddingBlock: 15,
            paddingInline: isModal ? 13 : 0,
            borderTop: isModal && '1px solid ' + colors.border,
            flexShrink: 0,
          }}
        >
          <Stack direction="row" align="center" justify="flex-end" spacing={2}>
            {selectedInst.items.size > 0 && (
              <Button onClick={onDeleteSelected}>
                Delete {selectedInst.items.size} cards
              </Button>
            )}
            <Button primary onClick={onCreateCreditCard}>
              Create new Card
            </Button>
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}

export default function ManageCreditCards({
  isModal,
  accountId,
  setLoading = () => {},
}) {
  return (
    <SchedulesQuery.Provider>
      <ManageCreditCardsContent
        isModal={isModal}
        accountId={accountId}
        setLoading={setLoading}
      />
    </SchedulesQuery.Provider>
  );
}
