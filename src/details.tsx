import * as React from 'react';
import flatMap from 'array.prototype.flatmap';
import Linkify from 'react-linkify';
import {FormattedMessage, InjectedIntl} from 'react-intl';
import {GedcomData} from './gedcom_util';
import {GedcomEntry} from 'parse-gedcom';
import {intlShape} from 'react-intl';
import {translateDate} from './date_util';

interface Props {
  gedcom: GedcomData;
  indi: string;
}

const EVENT_TAGS = ['BIRT', 'BAPM', 'CHR', 'DEAT', 'BURI'];
const EXCLUDED_TAGS = ['NAME', 'SEX', 'FAMC', 'FAMS', 'SOUR', 'NOTE'];
const TAG_DESCRIPTIONS = new Map([
  ['BAPM', 'Baptism'],
  ['BIRT', 'Birth'],
  ['BURI', 'Burial'],
  ['CHR', 'Christening'],
  ['DEAT', 'Death'],
  ['EMAIL', 'E-mail'],
  ['OCCU', 'Occupation'],
  ['TITL', 'Title'],
  ['WWW', 'WWW'],
]);

function translateTag(tag: string) {
  return (
    <FormattedMessage
      id={`gedcom.${tag}`}
      defaultMessage={TAG_DESCRIPTIONS.get(tag) || tag}
    />
  );
}

function joinLines(lines: (JSX.Element | string)[]) {
  return (
    <>
      {lines.map((line, index) => (
        <div key={index}>
          <Linkify properties={{target: '_blank'}}>{line}</Linkify>
          <br />
        </div>
      ))}
    </>
  );
}

/**
 * Returns the data for the given GEDCOM entry as an array of lines. Supports
 * continuations with CONT and CONC.
 */
function getData(entry: GedcomEntry) {
  const result = [entry.data];
  entry.tree.forEach((subentry) => {
    if (subentry.tag === 'CONC' && subentry.data) {
      const last = result.length - 1;
      result[last] += subentry.data;
    } else if (subentry.tag === 'CONT' && subentry.data) {
      result.push(subentry.data);
    }
  });
  return result;
}

function eventDetails(entry: GedcomEntry, intl: InjectedIntl) {
  const lines = [];
  const date = entry.tree.find((subentry) => subentry.tag === 'DATE');
  if (date && date.data) {
    lines.push(translateDate(date.data, intl));
  }
  const place = entry.tree.find((subentry) => subentry.tag === 'PLAC');
  if (place && place.data) {
    lines.push(...getData(place));
  }
  entry.tree
    .filter((subentry) => subentry.tag === 'NOTE')
    .forEach((note) =>
      getData(note).forEach((line) => lines.push(<i>{line}</i>)),
    );
  if (!lines.length) {
    return null;
  }
  return (
    <>
      <div className="ui sub header">{translateTag(entry.tag)}</div>
      <span>{joinLines(lines)}</span>
    </>
  );
}

function dataDetails(entry: GedcomEntry) {
  const lines = [];
  if (entry.data) {
    lines.push(...getData(entry));
  }
  entry.tree
    .filter((subentry) => subentry.tag === 'NOTE')
    .forEach((note) =>
      getData(note).forEach((line) => lines.push(<i>{line}</i>)),
    );
  if (!lines.length) {
    return null;
  }
  return (
    <>
      <div className="ui sub header">{translateTag(entry.tag)}</div>
      <span>{joinLines(lines)}</span>
    </>
  );
}

function noteDetails(entry: GedcomEntry) {
  return joinLines(
    getData(entry).map((line, index) => <i key={index}>{line}</i>),
  );
}

function nameDetails(entry: GedcomEntry) {
  return (
    <h2 className="ui header">
      {entry.data
        .split('/')
        .filter((name) => !!name)
        .map((name, index) => (
          <div key={index}>
            {name}
            <br />
          </div>
        ))}
    </h2>
  );
}

function getDetails(
  entries: GedcomEntry[],
  tags: string[],
  detailsFunction: (entry: GedcomEntry) => JSX.Element | null,
): JSX.Element[] {
  return flatMap(tags, (tag) =>
    entries
      .filter((entry) => entry.tag === tag)
      .map((entry) => detailsFunction(entry)),
  )
    .filter((element) => element !== null)
    .map((element, index) => (
      <div className="ui segment" key={index}>
        {element}
      </div>
    ));
}

function getOtherDetails(entries: GedcomEntry[]) {
  return entries
    .filter(
      (entry) =>
        !EXCLUDED_TAGS.includes(entry.tag) && !EVENT_TAGS.includes(entry.tag),
    )
    .map((entry) => dataDetails(entry))
    .filter((element) => element !== null)
    .map((element, index) => (
      <div className="ui segment" key={index}>
        {element}
      </div>
    ));
}

export class Details extends React.Component<Props, {}> {
  /** Make intl appear in this.context. */
  static contextTypes = {
    intl: intlShape,
  };

  render() {
    const entries = this.props.gedcom.indis[this.props.indi].tree;

    return (
      <div className="ui segments" id="details">
        {getDetails(entries, ['NAME'], nameDetails)}
        {getDetails(entries, EVENT_TAGS, (entry) =>
          eventDetails(entry, this.context.intl as InjectedIntl),
        )}
        {getOtherDetails(entries)}
        {getDetails(entries, ['NOTE'], noteDetails)}
      </div>
    );
  }
}
