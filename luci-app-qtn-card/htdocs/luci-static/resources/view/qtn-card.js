'use strict';
'require view';
'require rpc';
'require ui';
'require form';

var callGet = rpc.declare({
	object: 'luci.qtn-card',
	method: 'get',
	expect: { '': {} }
});

var callSet = rpc.declare({
	object: 'luci.qtn-card',
	method: 'set',
	params: [ 'ssid', 'key', 'channel', 'radio' ],
	expect: { '': {} }
});

function printable(value) {
	return /^[\x20-\x7e]*$/.test(value);
}

return view.extend({
	handleSaveApply: null,
	handleReset: null,

	load: function() {
		return callGet();
	},

	apply: function(ssid, key, channel, radio) {
		return callSet(ssid, key, channel, radio).then(function(res) {
			if (res.error)
				ui.addNotification(null, E('p', res.error), 'error');
			else
				window.location.reload();
		});
	},

	handleRadio: function(on) {
		return this.apply(undefined, undefined, undefined, on ? 'on' : 'off');
	},

	handleSave: function() {
		var st = this.state, net = this.net;

		return this.map.parse().then(L.bind(function() {
			var ssid = (net.ssid != st.ssid) ? net.ssid : undefined,
			    key = net.key || undefined,
			    channel = (net.channel != (st.configured || '0')) ? net.channel : undefined;

			if (ssid === undefined && key === undefined && channel === undefined) {
				ui.addNotification(null, E('p', _('Nothing to change.')), 'info');
				return;
			}

			return this.apply(ssid, key, channel, undefined);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', e.message), 'error');
		});
	},

	render: function(st) {
		var head = E('h2', _('5 GHz'));

		if (st.error)
			return E([], [ head, E('p', { 'class': 'alert-message error' }, st.error) ]);

		var on = (st.radio == 'On'), rows, m, s, o;

		rows = [
			[ _('Radio'), on ? _('On') : _('Off') ],
			[ _('Channel in use'), on ? st.channel : '-' ],
			[ _('Width'), (on && st.bw) ? st.bw + ' MHz' : '-' ],
			[ _('Clients'), st.clients || '0' ],
			[ _('Region'), st.region ],
			[ _('Card system'), st.firmware ]
		];

		this.state = st;
		this.net = { ssid: st.ssid || '', key: '', channel: st.configured || '0' };

		m = new form.JSONMap({ net: this.net });
		this.map = m;
		m.readonly = !on;

		s = m.section(form.NamedSection, 'net', 'net', _('5 GHz network'),
			_('Changes apply at once. Changing the SSID or the key drops the 5 GHz clients; they return within a few minutes.'));

		o = s.option(form.Value, 'ssid', _('SSID'));
		o.rmempty = false;
		o.validate = function(section_id, value) {
			return (value.length >= 1 && value.length <= 32 && printable(value)) ||
				_('1 to 32 printable ASCII characters');
		};

		o = s.option(form.Value, 'key', _('Key'));
		o.password = true;
		o.placeholder = _('unchanged');
		o.validate = function(section_id, value) {
			return value == '' || (value.length >= 8 && value.length <= 63 && printable(value)) ||
				_('8 to 63 printable ASCII characters');
		};

		o = s.option(form.ListValue, 'channel', _('Channel'),
			_('The upper channels (52 and up) cost a 60 s radar check before the network comes up.'));
		o.value('0', _('Automatic'));
		(st.channels || '').split(/[\s,]+/).forEach(function(c) {
			if (c != '')
				o.value(c);
		});

		return m.render().then(L.bind(function(node) {
			return E([], [
				head,
				(st.login == 'open') ? E('p', { 'class': 'alert-message warning' },
					_('The card has no root password: anyone on the network can log into it. Run qtn-card install on a terminal.')) : '',
				E('table', { 'class': 'table' }, rows.map(function(r) {
					return E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td left', 'width': '33%' }, r[0]),
						E('td', { 'class': 'td left' }, r[1])
					]);
				})),
				E('p', {}, [
					E('button', {
						'class': 'cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, 'handleRadio', !on)
					}, on ? _('Turn the radio off') : _('Turn the radio on')),
					' ',
					E('button', {
						'class': 'cbi-button',
						'click': function() { window.location.reload(); }
					}, _('Refresh'))
				]),
				node
			]);
		}, this));
	}
});
