import React, { Component } from 'react'
import { Input, Segment, Form, Header, Card, Button, Select, Icon } from 'semantic-ui-react'
import DatePicker from 'react-datepicker';
import moment from 'moment';
import MediaQuery from 'react-responsive';
import 'react-datepicker/dist/react-datepicker.css';

import util from '../util/util'
import CustomCard from '../Card/Card'
import './Home.css'

export default class HomeComponent extends Component {
  constructor(props) {
    super(props);
    this.urlParams = new URLSearchParams(window.location.search);
    this.state = {
      links: [],
      usedSettings: this.urlParams.get('customUrl') ? ['custom'] : [],
      customID: this.urlParams.get('customUrl') ? this.urlParams.get('customUrl') : '',
      showCustomIDError: false,
      expiration: null,
      displayURL: window.location.origin
    }
  }
  handleURLChange = (e, { value }) => this.url = value
  handleUTMSourceChange = (e, { value }) => this.utmSource = value
  handleUTMCampaignChange = (e, { value }) => this.utmCampaign = value
  handleUTMMediumChange = (e, { value }) => this.utmMedium = value
  handleCustomExpirationChange = expire => this.setState({ expiration: expire })
  handleCustomIDChange = (e, { value }) => {
    this.setState({ customID: value })
    util.lookupEntry(value, () => this.setState({ showCustomIDError: true }), () => this.setState({ showCustomIDError: false }))
  }
  onSettingsChange = (e, { value }) => {
    this.setState({ usedSettings: value })
  }

  componentDidMount() {
    this.urlInput.focus()
    util.getDisplayURL()
      .then(displayURL => this.setState({ displayURL }));
  }
  handleURLSubmit = () => {
    if (!this.state.showCustomIDError) {
      util.createEntry({
        URL: this.url,
        ID: this.state.usedSettings.includes("custom") ? this.state.customID : undefined,
        Expiration: this.state.usedSettings.includes("expire") && this.state.expiration ? this.state.expiration.toISOString() : undefined,
        Campaign: this.state.usedSettings.includes("campaign") && this.utmCampaign ? this.utmCampaign : undefined,
        Source: this.state.usedSettings.includes("source") && this.utmSource ? this.utmSource : undefined,
        Medium: this.state.usedSettings.includes("medium") && this.utmMedium ? this.utmMedium : undefined
      }, r => this.setState({
        links: [...this.state.links, {
          shortenedURL: this.state.displayURL + "/" + r.ID,
          originalURL: this.url,
          expiration: this.state.usedSettings.includes("expire") && this.state.expiration ? this.state.expiration.toISOString() : undefined,
          deletionURL: r.DeletionURL
        }]
      }))
    }
  }

  render() {
    const options = [
      { text: 'Custom URL', value: 'custom' },
      { text: 'Expiration', value: 'expire' },
      { text: 'UTM Campaign', value: 'campaign' },
      { text: 'UTM Source', value: 'source' },
      { text: 'UTM Medium', value: 'medium' },
    ]
    const { links, usedSettings, showCustomIDError, expiration } = this.state
    return (
      <div>
        <Segment raised>
          {this.urlParams.get("customUrl") ? (
            <Header size='medium'>I don't have a link named <em>"{this.urlParams.get("customUrl")}"</em> in my database, would
            you like to create one?</Header>
          ) :
            <Header size='huge'>Simplify your links</Header>
          }
          <Form onSubmit={this.handleURLSubmit} autoComplete="off">
            <Form.Field>
              <Input required size='large' type='url' ref={input => this.urlInput = input} onChange={this.handleURLChange} placeholder='Paste a link to shorten it' action>
                <input />
                <MediaQuery query="(min-width: 768px)">
                  <Select options={options} placeholder='Settings' value={this.state.usedSettings} onChange={this.onSettingsChange} multiple />
                </MediaQuery>
                <Button type='submit'>Shorten<Icon name="arrow right" /></Button>
              </Input>
            </Form.Field>
            <MediaQuery query="(max-width: 767px)">
              <Form.Field>
                <Select options={options} placeholder='Settings' onChange={this.onSettingsChange} multiple fluid />
              </Form.Field>
            </MediaQuery>
            <Form.Group style={{ marginBottom: "1rem" }}>
              {usedSettings.includes("custom") && <Form.Field error={showCustomIDError} width={16}>
                <Input label={this.state.displayURL + "/"} onChange={this.handleCustomIDChange} placeholder='my-shortened-url' value={this.state.customID} />
              </Form.Field>}
            </Form.Group>
            <Form.Group widths="equal">
              {usedSettings.includes("expire") && <Form.Field>
                <DatePicker showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  placeholderText="Click to select a date"
                  dateFormat="LLL"
                  onChange={this.handleCustomExpirationChange}
                  selected={expiration}
                  customInput={<Input label="Expiration" />}
                  minDate={moment()} />
              </Form.Field>}
              {usedSettings.includes("campaign") && <Form.Field>
                <Input label='UTM Campaign' onChange={this.handleUTMCampaignChange} /></Form.Field>}
              {usedSettings.includes("source") && <Form.Field>
                <Input label='UTM Source' onChange={this.handleUTMSourceChange} /></Form.Field>}
              {usedSettings.includes("medium") && <Form.Field>
                <Input label='UTM Medium' onChange={this.handleUTMMediumChange} /></Form.Field>}
            </Form.Group>
          </Form>
        </Segment>
        <Card.Group itemsPerRow="2" stackable style={{ marginTop: "1rem" }}>
          {links.map((link, i) => <CustomCard key={i} header={new URL(link.originalURL).hostname} expireDate={link.expiration} metaHeader={link.originalURL} description={link.shortenedURL} deletionURL={link.deletionURL} />)}
        </Card.Group>
      </div >
    )
  }
}
